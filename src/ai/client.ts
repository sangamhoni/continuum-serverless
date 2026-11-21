import type { Env, ClassificationResult, MemoryType } from '../types';
import type { LLMMessage, EmbeddingResponse } from './types';
import { PROMPTS } from './prompts';

export class AIClient {
  private ai: Ai;

  constructor(env: Env) {
    this.ai = env.AI;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
      text: [text],
    }) as EmbeddingResponse;
    return response.data[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
      text: texts,
    }) as EmbeddingResponse;
    return response.data;
  }

  async complete(messages: LLMMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const response = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    });
    return (response as any).response;
  }

  async classify(content: string): Promise<ClassificationResult> {
    const prompt = PROMPTS.classify(content);
    const response = await this.complete(prompt, { temperature: 0.3 });
    return this.parseClassification(response);
  }

  async extractConcepts(content: string): Promise<string[]> {
    const prompt = PROMPTS.extractConcepts(content);
    const response = await this.complete(prompt, { temperature: 0.3 });
    return this.parseConcepts(response);
  }

  async summarize(content: string): Promise<string> {
    const prompt = PROMPTS.summarize(content);
    const response = await this.complete(prompt, { temperature: 0.5 });
    return response.trim();
  }

  async synthesize(
    query: string,
    memories: Array<{ id: string; content: string; date: string; context?: string }>
  ): Promise<{ answer: string; citedIds: Array<{ id: string; citationNum: number }> }> {
    const prompt = PROMPTS.synthesize(query, memories);
    const response = await this.complete(prompt, { 
      maxTokens: 2048,
      temperature: 0.7 
    });
    return this.parseSynthesis(response, memories);
  }

  async reflect(
    concepts: Array<{ name: string; frequency: number }>,
    memories: Array<{ content: string; date: string }>
  ): Promise<string> {
    const prompt = PROMPTS.reflect(concepts, memories);
    return this.complete(prompt, { maxTokens: 1024, temperature: 0.7 });
  }

  private parseClassification(response: string): ClassificationResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: this.validateType(parsed.type),
          category: parsed.category || 'general',
          concepts: parsed.concepts || [],
          confidence: parsed.confidence || 0.8,
        };
      }
    } catch (e) {
      // fallback
    }
    return {
      type: 'note',
      category: 'general',
      concepts: [],
      confidence: 0.5,
    };
  }

  private validateType(type: string): MemoryType {
    const validTypes: MemoryType[] = ['note', 'url', 'thought', 'paragraph', 'question'];
    return validTypes.includes(type as MemoryType) ? type as MemoryType : 'note';
  }

  private parseConcepts(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // fallback to splitting
    }
    return response
      .split(/[,\n]/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0 && s.length < 50);
  }

  private parseSynthesis(
    response: string,
    memories: Array<{ id: string; content: string }>
  ): { answer: string; citedIds: Array<{ id: string; citationNum: number }> } {
    const citationPattern = /\[(\d+)\]/g;
    const matches = [...response.matchAll(citationPattern)];
    const citedMap = new Map<number, string>();
    
    // Map citation numbers to memory IDs based on array position
    matches.forEach(match => {
      const citationNum = parseInt(match[1]);
      const arrayIndex = citationNum - 1; // Convert to 0-based index
      if (arrayIndex >= 0 && arrayIndex < memories.length) {
        citedMap.set(citationNum, memories[arrayIndex].id);
      }
    });
    
    // Convert to array preserving original citation numbers
    const citedIds = Array.from(citedMap.entries())
      .map(([citationNum, id]) => ({ id, citationNum }))
      .sort((a, b) => a.citationNum - b.citationNum); // Sort by citation number

    return { answer: response, citedIds };
  }
}

