/**
 * Sanitizes user-provided text before embedding it into AI prompts.
 * Strips common prompt injection patterns while preserving legitimate content.
 */
export function sanitizePromptInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove attempts to override system/assistant roles
    .replace(/\b(system|assistant)\s*:/gi, '')
    // Remove markdown-style instruction overrides
    .replace(/```(system|instruction|prompt)[^`]*```/gi, '')
    // Remove XML-style injection tags
    .replace(/<\/?(?:system|instruction|prompt|override|ignore)[^>]*>/gi, '')
    // Remove "ignore previous instructions" patterns
    .replace(/ignore\s+(all\s+)?previous\s+(instructions|prompts|context)/gi, '')
    // Remove "you are now" role reassignment
    .replace(/you\s+are\s+now\b/gi, '')
    // Remove attempts to reveal system prompt
    .replace(/(?:repeat|show|reveal|print|output)\s+(?:the\s+)?(?:system\s+)?(?:prompt|instructions)/gi, '')
    // Collapse multiple newlines to prevent prompt structure manipulation
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
