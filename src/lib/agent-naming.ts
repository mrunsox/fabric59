/**
 * Naming convention utilities for agent provisioning.
 * Privacy-first: never expose the full last name in any generated value.
 */

/**
 * Derive the email handle from a full name.
 * "John Smith" → "johns"
 * "Mary Jane Watson" → "maryjanew"
 * (first + middle names + last initial, all lowercase)
 */
export function deriveEmailHandle(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].toLowerCase();
  const firstParts = parts.slice(0, -1).map(p => p.toLowerCase()).join('');
  const lastInitial = parts[parts.length - 1][0].toLowerCase();
  return firstParts + lastInitial;
}

/**
 * Derive the Five9 username from a full name.
 * "John Smith" → "John S"
 * "Mary Jane Watson" → "Mary Jane W"
 * (first + middle names preserved, last initial uppercase)
 */
export function deriveFive9Username(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const firstParts = parts.slice(0, -1).join(' ');
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${firstParts} ${lastInitial}`;
}

/**
 * Derive a privacy-safe display name.
 * "John Smith" → "John S."
 */
export function deriveDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Generate a strong random password.
 */
export function generatePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
