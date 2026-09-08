/**
 * UUID Validation and Assertion Utilities
 * Ensures all database entity IDs comply with PostgreSQL RFC 4122 UUID specifications.
 */

// Matches standard 8-4-4-4-12 hexadecimal UUIDs accepted by PostgreSQL
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Checks whether a given value is a valid PostgreSQL UUID.
 * Rejects pseudo-UUIDs (e.g., 'emp11111...', 's0111111...', 'v0111111...', 'u0111111...')
 */
export function isValidUUID(value: any): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value.trim());
}

/**
 * Asserts that a value is a valid UUID before sending it to Supabase.
 * Throws a user-friendly Marathi error if invalid, preventing PostgreSQL 22P02 errors.
 */
export function assertValidUUID(value: any, fieldName: string = 'नोंद ओळख क्रमांक (ID)'): asserts value is string {
  if (!isValidUUID(value)) {
    const technicalMsg = `[UUID Assertion Error] Invalid UUID for field '${fieldName}': received value "${value}"`;
    console.error(technicalMsg);
    throw new Error(`अवैध नोंद ओळख क्रमांक आढळला (${fieldName}). कृपया पुन्हा लॉगिन करा किंवा प्रशासकाशी संपर्क साधा.`);
  }
}

/**
 * Normalizes gender value to strict Marathi values required by database check constraint:
 * 'पुरुष' | 'स्त्री' | 'इतर'
 */
export function normalizeGenderToMarathi(gender: string | null | undefined): 'पुरुष' | 'स्त्री' | 'इतर' {
  if (!gender) return 'पुरुष';
  const clean = gender.trim();
  if (clean === 'पुरुष' || clean === 'स्त्री' || clean === 'इतर') {
    return clean;
  }
  const upper = clean.toUpperCase();
  if (upper === 'MALE' || upper === 'M' || upper === 'MAN' || upper === 'BOY') {
    return 'पुरुष';
  }
  if (upper === 'FEMALE' || upper === 'F' || upper === 'WOMAN' || upper === 'GIRL') {
    return 'स्त्री';
  }
  if (upper === 'OTHER' || upper === 'TG' || upper === 'TRANSGENDER') {
    return 'इतर';
  }
  return 'पुरुष';
}
