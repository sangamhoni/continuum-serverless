import { AIClient } from '../ai';
import { cosineSimilarity, findTopK } from '../utils/similarity';
import type {
  Env,
  RawMemory,
  MemoryType,
  SaveMemoryRequest,
  SaveMemoryResponse,
  ChatRequest,
  ChatResponse,
  Citation,
  BrowseMemoriesRequest,
  BrowseMemoriesResponse,
  LinkMemoriesRequest,
  MergeMemoriesRequest,
} from '../types';

export class MemoryBrain implements DurableObject {
  private storage: DurableObjectStorage;
  private env: Env;
  private ai: AIClient;

  // caches - loaded on first use
  private embeddingCache: Map<string, number[]> | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.env = env;
    this.ai = new AIClient(env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/memory' && method === 'POST') {
        return this.handleSaveMemory(request);
      }
      if (path === '/memory' && method === 'GET') {
        return this.handleGetMemory(url);
      }
      if (path === '/memories' && method === 'GET') {
        return this.handleListMemories(url);
      }
      if (path.startsWith('/memory/') && method === 'DELETE') {
        const id = path.replace('/memory/', '');
        return this.handleDeleteMemory(id);
      }
      if (path.startsWith('/memory/') && method === 'PUT') {
        const id = path.replace('/memory/', '');
        return this.handleUpdateMemory(id, request);
      }
      if (path === '/chat' && method === 'POST') {
        return this.handleChat(request);
      }
      if (path === '/link' && method === 'POST') {
        return this.handleLinkMemories(request);
      }
      if (path === '/merge' && method === 'POST') {
        return this.handleMergeMemories(request);
      }

      return this.json({ error: 'not found' }, 404);
    } catch (error) {
      console.error('DO error:', error);
      return this.json({ error: String(error) }, 500);
    }
  }

  private async handleSaveMemory(request: Request): Promise<Response> {
    const body: SaveMemoryRequest = await request.json();
    const { content, userContext, tags = [] } = body;

    // classify content
    const classification = await this.ai.classify(content);
    const type = body.overrideType || classification.type;
    const category = body.overrideCategory || classification.category;

    // generate embedding
    const embedding = await this.ai.embed(content);

    // create memory
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const memory: RawMemory = {
      id,
      content,
      type,
      category,
      categoryConfirmed: !!body.confirmCategory,
      userContext,
      tags: [...tags, ...classification.concepts.slice(0, 3)],
      linkedMemoryIds: [],
      createdAt: now,
      updatedAt: now,
    };

    // find similar memories for linking suggestions
    const embeddings = await this.getAllEmbeddings();
    const candidates = Array.from(embeddings.entries()).map(([id, vector]) => ({ id, vector }));
    const similar = findTopK(embedding, candidates, 5, 0.7);
    
    const suggestedLinks: RawMemory[] = [];
    let mergeCandidate: RawMemory | undefined;

    for (const match of similar) {
      const mem = await this.getRawMemory(match.id);
      if (mem) {
        if (match.score > 0.92 && !mergeCandidate) {
          mergeCandidate = mem;
        } else {
          suggestedLinks.push(mem);
        }
      }
    }

    // generate summary and add to memory
    const aiSummary = await this.ai.summarize(content);
    memory.aiSummary = aiSummary;

    // save everything
    await this.storage.put(`raw:${id}`, memory);
    await this.storage.put(`embed:${id}`, embedding);
    
    // update cache
    if (this.embeddingCache) {
      this.embeddingCache.set(id, embedding);
    }

    // update concepts
    for (const concept of classification.concepts) {
      await this.updateConcept(concept, id, 'add');
    }

    const response: SaveMemoryResponse = {
      success: true,
      memory,
      suggestedLinks: suggestedLinks.slice(0, 3),
      mergeCandidate,
      aiSummary,
    };

    return this.json(response);
  }

  private async handleGetMemory(url: URL): Promise<Response> {
    const id = url.searchParams.get('id');
    if (!id) return this.json({ error: 'id required' }, 400);

    const memory = await this.getRawMemory(id);
    if (!memory) return this.json({ error: 'not found' }, 404);

    // get related memories
    const relatedMemories: RawMemory[] = [];
    for (const linkedId of memory.linkedMemoryIds) {
      const linked = await this.getRawMemory(linkedId);
      if (linked) relatedMemories.push(linked);
    }

    // get concepts for this memory
    const concepts = memory.tags;

    return this.json({ memory, concepts, relatedMemories });
  }

  private async handleListMemories(url: URL): Promise<Response> {
    // Handle multiple values for category and tags
    const categoryParams = url.searchParams.getAll('category');
    const tagsParams = url.searchParams.getAll('tags');
    const category = categoryParams.length > 0 ? categoryParams : undefined;
    const tags = tagsParams.length > 0 ? tagsParams : undefined;
    
    const params: BrowseMemoriesRequest = {
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      type: url.searchParams.get('type') as MemoryType | undefined,
      category,
      tags,
      search: url.searchParams.get('search') || undefined,
    };

    const allMemories = await this.storage.list<RawMemory>({ prefix: 'raw:' });
    let memories: RawMemory[] = [];

    for (const [_, memory] of allMemories) {
      memories.push(memory);
    }

    // filter
    if (params.type) {
      memories = memories.filter(m => m.type === params.type);
    }
    if (params.category) {
      const categories = Array.isArray(params.category) ? params.category : [params.category];
      memories = memories.filter(m => categories.includes(m.category));
    }
    if (params.tags) {
      const tagsArray = Array.isArray(params.tags) ? params.tags : [params.tags];
      memories = memories.filter(m => 
        tagsArray.some(tag => m.tags.includes(tag))
      );
    }
    if (params.search) {
      const search = params.search.toLowerCase();
      memories = memories.filter(m => 
        m.content.toLowerCase().includes(search) ||
        m.tags.some(t => t.toLowerCase().includes(search))
      );
    }

    // sort by date desc
    memories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = memories.length;
    memories = memories.slice(params.offset!, params.offset! + params.limit!);

    const response: BrowseMemoriesResponse = {
      memories,
      total,
      hasMore: params.offset! + memories.length < total,
    };

    return this.json(response);
  }

  private async handleDeleteMemory(id: string): Promise<Response> {
    const memory = await this.getRawMemory(id);
    if (!memory) return this.json({ error: 'not found' }, 404);

    // remove from linked memories
    for (const linkedId of memory.linkedMemoryIds) {
      const linked = await this.getRawMemory(linkedId);
      if (linked) {
        linked.linkedMemoryIds = linked.linkedMemoryIds.filter(lid => lid !== id);
        await this.storage.put(`raw:${linkedId}`, linked);
      }
    }

    // remove concepts
    for (const tag of memory.tags) {
      await this.updateConcept(tag, id, 'remove');
    }

    // delete storage
    await this.storage.delete(`raw:${id}`);
    await this.storage.delete(`embed:${id}`);

    // update cache
    if (this.embeddingCache) {
      this.embeddingCache.delete(id);
    }

    return this.json({ success: true, deletedId: id });
  }

  private async handleUpdateMemory(id: string, request: Request): Promise<Response> {
    const memory = await this.getRawMemory(id);
    if (!memory) return this.json({ error: 'not found' }, 404);

    const updates = await request.json() as Partial<RawMemory>;

    // handle tag changes - update concept index
    if (updates.tags) {
      const oldTags = memory.tags || [];
      const newTags = updates.tags;
      
      // remove from old concepts
      for (const tag of oldTags) {
        if (!newTags.includes(tag)) {
          await this.updateConcept(tag, id, 'remove');
        }
      }
      
      // add to new concepts
      for (const tag of newTags) {
        if (!oldTags.includes(tag)) {
          await this.updateConcept(tag, id, 'add');
        }
      }
    }

    // Regenerate AI summary if content changed
    if (updates.content && updates.content !== memory.content) {
      const newSummary = await this.ai.summarize(updates.content);
      updates.aiSummary = newSummary;
      
      // Also regenerate embedding if content changed
      const newEmbedding = await this.ai.embed(updates.content);
      await this.storage.put(`embed:${id}`, newEmbedding);
      
      // Update cache
      if (this.embeddingCache) {
        this.embeddingCache.set(id, newEmbedding);
      }
    }

    // apply updates
    const updatedMemory: RawMemory = {
      ...memory,
      ...updates,
      id: memory.id, // prevent id change
      createdAt: memory.createdAt, // prevent creation date change
      updatedAt: new Date().toISOString(),
    };

    await this.storage.put(`raw:${id}`, updatedMemory);
    
    return this.json({ success: true, memory: updatedMemory });
  }

  private async handleChat(request: Request): Promise<Response> {
    const body: ChatRequest = await request.json();
    const { message, categories, tags } = body;

    // get query embedding
    const queryEmbedding = await this.ai.embed(message);

    // Get all memories and filter by category/tags if provided
    const allMemories = await this.storage.list<RawMemory>({ prefix: 'raw:' });
    let filteredMemoryIds = new Set<string>();
    
    for (const [_, memory] of allMemories) {
      // Filter by category
      if (categories && categories.length > 0) {
        if (!categories.includes(memory.category)) {
          continue;
        }
      }
      
      // Filter by tags
      if (tags && tags.length > 0) {
        const hasMatchingTag = tags.some(tag => memory.tags.includes(tag));
        if (!hasMatchingTag) {
          continue;
        }
      }
      
      filteredMemoryIds.add(memory.id);
    }

    // Get embeddings only for filtered memories
    const embeddings = await this.getAllEmbeddings();
    const candidates = Array.from(embeddings.entries())
      .filter(([id]) => filteredMemoryIds.has(id))
      .map(([id, vector]) => ({ id, vector }));
    
    const matches = findTopK(queryEmbedding, candidates, 10, 0.5);

    // fetch matched memories
    const relevantMemories: Array<{ id: string; content: string; date: string; context?: string }> = [];
    for (const match of matches) {
      const memory = await this.getRawMemory(match.id);
      if (memory) {
        relevantMemories.push({
          id: memory.id,
          content: memory.content,
          date: memory.createdAt.split('T')[0],
          context: memory.userContext,
        });
      }
    }

    if (relevantMemories.length === 0) {
      return this.json({
        answer: "I don't have any memories that seem relevant to your question. Try saving some content first!",
        citations: [],
      });
    }

    // synthesize answer
    const { answer, citedIds } = await this.ai.synthesize(message, relevantMemories);

    // Build direct map: AI citation number (1-based array index) -> memory ID
    // The AI's [1] refers to relevantMemories[0], [2] to relevantMemories[1], etc.
    const aiNumToMemoryId = new Map<number, string>();
    for (const { id, citationNum } of citedIds) {
      aiNumToMemoryId.set(citationNum, id);
    }

    // Extract all citation numbers from answer text in order of appearance
    const citationPattern = /\[(\d+)\]/g;
    const allMatches = [...answer.matchAll(citationPattern)];
    
    // Track which memories are cited and in what order (first appearance)
    const citedInOrder: Array<{ aiNum: number; memoryId: string }> = [];
    const seenMemoryIds = new Set<string>();

    for (const match of allMatches) {
      const aiNum = parseInt(match[1]);
      const memoryId = aiNumToMemoryId.get(aiNum);
      
      // Only add if valid memory ID and not already seen
      if (memoryId && !seenMemoryIds.has(memoryId)) {
        citedInOrder.push({ aiNum, memoryId });
        seenMemoryIds.add(memoryId);
      }
    }

    // Build citations with sequential numbering (1, 2, 3...)
    let updatedAnswer = answer;
    const citations: Citation[] = [];
    const aiNumToNewNum = new Map<number, number>(); // Map old AI numbers to new sequential numbers
    
    for (let i = 0; i < citedInOrder.length; i++) {
      const newNum = i + 1;
      const { aiNum, memoryId } = citedInOrder[i];
      aiNumToNewNum.set(aiNum, newNum);
      
      const memory = await this.getRawMemory(memoryId);
      if (memory) {
        citations.push({
          index: newNum,
          memoryId: memory.id,
          content: memory.content.slice(0, 150),
          type: memory.type,
          date: memory.createdAt.split('T')[0],
          userContext: memory.userContext,
          tags: memory.tags || [],
          category: memory.category,
        });
      }
    }

    // Replace all citation numbers in answer text with new sequential numbers
    updatedAnswer = updatedAnswer.replace(/\[(\d+)\]/g, (match, numStr) => {
      const aiNum = parseInt(numStr);
      const newNum = aiNumToNewNum.get(aiNum);
      return newNum ? `[${newNum}]` : match; // Keep original if not in our map
    });

    const response: ChatResponse = { answer: updatedAnswer, citations };
    return this.json(response);
  }

  private async handleLinkMemories(request: Request): Promise<Response> {
    const body: LinkMemoriesRequest = await request.json();
    const { memoryId, linkToIds } = body;

    const memory = await this.getRawMemory(memoryId);
    if (!memory) return this.json({ error: 'memory not found' }, 404);

    for (const linkId of linkToIds) {
      const linked = await this.getRawMemory(linkId);
      if (!linked) continue;

      // bidirectional link
      if (!memory.linkedMemoryIds.includes(linkId)) {
        memory.linkedMemoryIds.push(linkId);
      }
      if (!linked.linkedMemoryIds.includes(memoryId)) {
        linked.linkedMemoryIds.push(memoryId);
        await this.storage.put(`raw:${linkId}`, linked);
      }
    }

    memory.updatedAt = new Date().toISOString();
    await this.storage.put(`raw:${memoryId}`, memory);

    return this.json({ success: true, memory });
  }

  private async handleMergeMemories(request: Request): Promise<Response> {
    const body: MergeMemoriesRequest = await request.json();
    const { keepId, mergeId } = body;

    const keep = await this.getRawMemory(keepId);
    const merge = await this.getRawMemory(mergeId);
    if (!keep || !merge) return this.json({ error: 'memory not found' }, 404);

    // combine content
    keep.content = `${keep.content}\n\n---\n\n${merge.content}`;
    
    // merge tags
    keep.tags = [...new Set([...keep.tags, ...merge.tags])];
    
    // merge links
    keep.linkedMemoryIds = [...new Set([...keep.linkedMemoryIds, ...merge.linkedMemoryIds])];
    keep.linkedMemoryIds = keep.linkedMemoryIds.filter(id => id !== mergeId && id !== keepId);
    
    // use earlier date
    if (new Date(merge.createdAt) < new Date(keep.createdAt)) {
      keep.createdAt = merge.createdAt;
    }
    keep.updatedAt = new Date().toISOString();

    // update links pointing to merged memory
    for (const linkedId of merge.linkedMemoryIds) {
      const linked = await this.getRawMemory(linkedId);
      if (linked && linkedId !== keepId) {
        linked.linkedMemoryIds = linked.linkedMemoryIds.filter(id => id !== mergeId);
        if (!linked.linkedMemoryIds.includes(keepId)) {
          linked.linkedMemoryIds.push(keepId);
        }
        await this.storage.put(`raw:${linkedId}`, linked);
      }
    }

    // regenerate embedding for combined content
    const newEmbedding = await this.ai.embed(keep.content);

    await this.storage.put(`raw:${keepId}`, keep);
    await this.storage.put(`embed:${keepId}`, newEmbedding);
    
    // delete merged
    await this.storage.delete(`raw:${mergeId}`);
    await this.storage.delete(`embed:${mergeId}`);

    if (this.embeddingCache) {
      this.embeddingCache.set(keepId, newEmbedding);
      this.embeddingCache.delete(mergeId);
    }

    return this.json({ success: true, memory: keep });
  }

  // helpers

  private async getRawMemory(id: string): Promise<RawMemory | null> {
    const memory = await this.storage.get<RawMemory>(`raw:${id}`);
    return memory ?? null;
  }

  private async getAllEmbeddings(): Promise<Map<string, number[]>> {
    if (this.embeddingCache) {
      return this.embeddingCache;
    }
    
    const entries = await this.storage.list<number[]>({ prefix: 'embed:' });
    this.embeddingCache = new Map();
    for (const [key, value] of entries) {
      const id = key.replace('embed:', '');
      this.embeddingCache.set(id, value);
    }
    return this.embeddingCache;
  }

  private async updateConcept(name: string, memoryId: string, action: 'add' | 'remove'): Promise<void> {
    const key = `concept:${name.toLowerCase()}`;
    const existing = await this.storage.get<string[]>(key) || [];
    
    if (action === 'add' && !existing.includes(memoryId)) {
      existing.push(memoryId);
    } else if (action === 'remove') {
      const idx = existing.indexOf(memoryId);
      if (idx > -1) existing.splice(idx, 1);
    }
    
    if (existing.length > 0) {
      await this.storage.put(key, existing);
    } else {
      await this.storage.delete(key);
    }
  }

  private json(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
