import { AICompletionRequest, AICompletionResponse, AIModelConfig } from '@/src/ai/types/ai.types';

const DEFAULT_CONFIG: AIModelConfig = {
  model: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 4096,
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// HTTP status codes that are safe to retry
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class AIClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultConfig: AIModelConfig;

  constructor(config?: { apiKey?: string; baseUrl?: string; modelConfig?: Partial<AIModelConfig> }) {
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://api.openai.com/v1';
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config?.modelConfig };
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const config = { ...this.defaultConfig, ...request.config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: request.messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            top_p: config.topP,
            ...(request.responseFormat === 'json' && {
              response_format: { type: 'json_object' },
            }),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();

          // Only retry on transient errors
          if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
            // Use Retry-After header if available (common for 429)
            const retryAfter = response.headers.get('retry-after');
            const delay = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : BASE_DELAY_MS * Math.pow(2, attempt); // exponential backoff

            lastError = new Error(`AI API error (${response.status}): ${errorBody}`);
            await this.sleep(delay);
            continue;
          }

          throw new Error(`AI API error (${response.status}): ${errorBody}`);
        }

        const data = await response.json();

        return {
          content: data.choices[0].message.content,
          usage: {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
          model: data.model,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Network errors (fetch throws) are retryable
        const isNetworkError = !(error instanceof Error && error.message.startsWith('AI API error'));
        if (isNetworkError && attempt < MAX_RETRIES) {
          await this.sleep(BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        // Non-retryable API errors — throw immediately
        if (!isNetworkError) {
          throw error;
        }
      }
    }

    throw lastError || new Error('AI request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
