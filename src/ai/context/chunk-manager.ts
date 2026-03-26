import { estimateTokenCount } from './token-counter';

interface ContentChunk {
  index: number;
  content: string;
  tokenCount: number;
}

/**
 * Splits large dosificação content into manageable chunks
 * for processing by the AI model.
 */
export class ChunkManager {
  private readonly maxChunkTokens: number;

  constructor(maxChunkTokens = 3000) {
    this.maxChunkTokens = maxChunkTokens;
  }

  splitContent(content: string): ContentChunk[] {
    const sections = content.split(/\n(?=##?\s)/);
    const chunks: ContentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const section of sections) {
      const combinedTokens = estimateTokenCount(currentChunk + section);

      if (combinedTokens > this.maxChunkTokens && currentChunk) {
        chunks.push({
          index: chunkIndex++,
          content: currentChunk.trim(),
          tokenCount: estimateTokenCount(currentChunk),
        });
        currentChunk = section;
      } else {
        currentChunk += '\n' + section;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        index: chunkIndex,
        content: currentChunk.trim(),
        tokenCount: estimateTokenCount(currentChunk),
      });
    }

    return chunks;
  }
}
