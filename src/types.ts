// memory stuff

export type MemoryType = 'note' | 'url' | 'thought' | 'paragraph' | 'question';

export interface RawMemory {
  id: string;
  content: string;
  type: MemoryType;
  category: string;
  categoryConfirmed: boolean;
  userContext?: string;  // why user saved this
  aiSummary?: string;    // AI-generated content summary
  tags: string[];
  linkedMemoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEmbedding {
  memoryId: string;
  vector: number[];  // 768 dims from bge
}

export interface Concept {
  name: string;
  memoryIds: string[];
  frequency: number;
  lastSeen: string;
}

export interface Reflection {
  id: string;
  summary: string;
  sourceMemoryIds: string[];
  createdAt: string;
}

// api requests/responses

export interface SaveMemoryRequest {
  content: string;
  userContext?: string;
  tags?: string[];
  confirmCategory?: boolean;
  overrideType?: MemoryType;
  overrideCategory?: string;
}

export interface SaveMemoryResponse {
  success: boolean;
  memory: RawMemory;
  suggestedLinks: RawMemory[];
  mergeCandidate?: RawMemory;  // if we found a duplicate
  aiSummary: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  categories?: string[];
  tags?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Citation {
  index: number;
  memoryId: string;
  content: string;
  type: MemoryType;
  date: string;
  userContext?: string;
  tags?: string[];
  category?: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];  // sources the ai used
}

export interface BrowseMemoriesRequest {
  limit?: number;
  offset?: number;
  type?: MemoryType;
  category?: string | string[];
  tags?: string | string[];
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface BrowseMemoriesResponse {
  memories: RawMemory[];
  total: number;
  hasMore: boolean;
}

export interface MemoryDetailResponse {
  memory: RawMemory;
  concepts: string[];
  relatedMemories: RawMemory[];
}

export interface DeleteMemoryResponse {
  success: boolean;
  deletedId: string;
}

export interface LinkMemoriesRequest {
  memoryId: string;
  linkToIds: string[];
}

export interface MergeMemoriesRequest {
  keepId: string;
  mergeId: string;
}

// ai related

export interface ClassificationResult {
  type: MemoryType;
  category: string;
  concepts: string[];
  confidence: number;  // 0-1
}

export interface SimilarityMatch {
  memoryId: string;
  score: number;
}

// env bindings - what wrangler gives us

export interface Env {
  AI: Ai;
  MEMORY_BRAIN: DurableObjectNamespace;
}

// not using this rn but good to have for reference
export interface StorageSchema {}
