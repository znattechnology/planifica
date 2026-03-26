export interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  config?: Partial<AIModelConfig>;
  responseFormat?: 'text' | 'json';
}

export interface AICompletionResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}
