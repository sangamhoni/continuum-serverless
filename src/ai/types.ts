// types for workers ai calls

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  response: string;
}

export interface EmbeddingRequest {
  text: string | string[];
}

export interface EmbeddingResponse {
  shape: number[];
  data: number[][];  // array of vectors
}

// prompt inputs - what we pass to build prompts

export interface ClassifyPromptInput {
  content: string;
}

export interface SummarizePromptInput {
  content: string;
  existingConcepts?: string[];
}

export interface SynthesizePromptInput {
  query: string;
  relevantMemories: Array<{
    id: string;
    content: string;
    date: string;
    context?: string;
  }>;
}

export interface ReflectPromptInput {
  concepts: Array<{
    name: string;
    frequency: number;
  }>;
  recentMemories: Array<{
    content: string;
    date: string;
  }>;
}
