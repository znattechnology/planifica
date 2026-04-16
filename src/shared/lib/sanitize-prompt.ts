/**
 * Sanitizes user-provided text before embedding it into AI prompts.
 * Strips common prompt injection patterns while preserving legitimate content.
 */
export function sanitizePromptInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Normalize unicode first to defeat homoglyph and full-width character bypasses
    // e.g. "ｉｇｎｏｒｅ" (full-width) → "ignore"; Cyrillic "і" stays distinct but is rare
    .normalize('NFKC')
    // Remove attempts to override system/assistant roles (EN + PT)
    .replace(/\b(system|assistant)\s*:/gi, '')
    // Remove markdown-style instruction overrides
    .replace(/```(system|instruction|prompt)[^`]*```/gi, '')
    // Remove XML-style injection tags
    .replace(/<\/?(?:system|instruction|prompt|override|ignore)[^>]*>/gi, '')
    // Remove "ignore previous instructions" patterns (EN)
    .replace(/ignore\s+(all\s+)?previous\s+(instructions|prompts|context)/gi, '')
    // Remove Portuguese equivalents: "ignora/ignore as instruções anteriores"
    .replace(/ignora[r]?\s+(todas\s+as\s+)?instru[çc][õo]es\s+anteriores/gi, '')
    // Remove "you are now" role reassignment (EN + PT)
    // EN: "you are now" is unambiguous in injection context
    .replace(/you\s+are\s+now\b/gi, '')
    // PT: require explicit subject "tu" to avoid stripping "é agora que estudamos" (legitimate)
    .replace(/\btu\s+és?\s+agora\b/gi, '')
    // PT: "actua/actue como" only when followed by a role noun (avoid "actua como combustível")
    .replace(/\bact[ue]\s+como\s+(?:um[a]?\s+)?(?:assistente|sistema|IA\b|bot\b|modelo|GPT|LLM)/gi, '')
    // Remove attempts to reveal system prompt (EN + PT)
    .replace(/(?:repeat|show|reveal|print|output)\s+(?:the\s+)?(?:system\s+)?(?:prompt|instructions)/gi, '')
    .replace(/(?:repete|mostra|revela|imprime)\s+(?:as?\s+)?(?:instru[çc][õo]es|prompt)/gi, '')
    // Strip structural prompt markers (══ used as section dividers internally)
    .replace(/══[^══]*══/g, '')
    // Remove inline parenthetical injection phrases while preserving academic annotations.
    // "output" excluded — too common in CS/tech curricula e.g. "(expected output: tabela)".
    // "override" kept — has no legitimate academic use.
    .replace(/\([^)]*\b(?:ignorar|instru[çc][õo]es|contexto anterior|responde|override)\b[^)]*\)/gi, '')
    // Collapse multiple newlines to prevent prompt structure manipulation
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
