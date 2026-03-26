/**
 * Centralized AI configuration constants.
 * Shared across all AI services for consistency.
 */

/** Pacing threshold: teacher is considered "slow" if avg duration > this ratio */
export const PACING_THRESHOLD = 1.1;

/** Inverse pacing: teacher is "fast" if avg duration < this ratio */
export const FAST_PACING_THRESHOLD = 1 - (PACING_THRESHOLD - 1); // 0.9

/** Default AI temperature for plan generation (deterministic output) */
export const AI_TEMPERATURE = 0.3;

/** Default max tokens for plan generation */
export const AI_MAX_TOKENS = 8192;

/** Minimum teacher note length to extract difficulty signals (avoids noise from "Ok", "Feito") */
export const MIN_NOTE_LENGTH_FOR_DIFFICULTY = 15;

/**
 * Normalizes text for topic matching: lowercase, collapse whitespace, strip accents.
 * "Fracções" === "Frações" === "Fracoes" after normalization.
 */
export function normalizeText(text: string): string {
  return (text ?? '').toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
