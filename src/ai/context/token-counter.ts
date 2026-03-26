/**
 * Estimates token count for text content.
 * Uses a rough approximation (~4 chars per token for English/Portuguese).
 * For production, integrate tiktoken or similar library.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function isWithinTokenLimit(text: string, maxTokens: number): boolean {
  return estimateTokenCount(text) <= maxTokens;
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4;
  if (text.length <= estimatedChars) return text;
  return text.slice(0, estimatedChars) + '\n[Content truncated due to length]';
}
