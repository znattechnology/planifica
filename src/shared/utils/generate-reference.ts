import { randomInt } from 'crypto';

/**
 * Generates a unique Multicaixa Express-style payment reference.
 * Format: AO + 10 random digits  →  e.g. "AO4728193042"
 *
 * The prefix "AO" denotes Angola; the digit block has 10^10 possible
 * values, making accidental collisions negligible. The repository layer
 * still enforces a unique constraint as the hard guarantee.
 */
export function generateReference(): string {
  const digits = Array.from({ length: 10 }, () => randomInt(0, 10)).join('');
  return `AO${digits}`;
}
