// lib/handles.ts

/** Contract-compatible handle regex: 3..32 chars, [a-z0-9._-] only */
export const HANDLE_REGEX = /^[a-z0-9._-]{3,32}$/;

export type HandleValidation =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Normalize user input into a candidate handle "id":
 * - trims whitespace
 * - strips *one or more* leading '@'
 * - lowercases (ASCII-only)
 */
export function normalizeHandle(input = ''): string {
  return String(input).trim().replace(/^@+/, '').toLowerCase();
}

/** True if the normalized handle matches the contract rules. */
export function isValidHandle(handle: string): boolean {
  return HANDLE_REGEX.test(handle);
}

/** Validate a handle and return a friendly reason when invalid (great for UI/error toasts). */
export function validateHandle(raw: string): HandleValidation {
  const h = normalizeHandle(raw);

  if (!h) return { ok: false, reason: 'Handle is required' };
  if (h.length < 3) return { ok: false, reason: 'Handle must be at least 3 characters' };
  if (h.length > 32) return { ok: false, reason: 'Handle must be 32 characters or fewer' };
  if (!HANDLE_REGEX.test(h)) {
    return { ok: false, reason: 'Use only letters, numbers, dots, underscores, or hyphens' };
  }
  return { ok: true };
}

/**
 * Normalize + validate in one go; returns a safe result object.
 * Uses an `'in'` type guard so narrowing works under `isolatedModules`.
 */
export function tryNormalizeHandle(
  input: string
): { ok: true; handle: string } | { ok: false; error: string } {
  const handle = normalizeHandle(input);
  const v = validateHandle(handle);

  if ('reason' in v) {
    return { ok: false, error: v.reason };
  }
  return { ok: true, handle };
}

/** Throwing variant for server routes where you want to abort fast. */
export function assertValidHandle(input: string): string {
  const res = tryNormalizeHandle(input);
  // Use `'in'` guard instead of `res.ok` (safer under isolatedModules)
  if ('error' in res) throw new Error(res.error);
  return res.handle;
}

/** Convenience: presentational format with a single leading '@'. */
export function formatHandle(handle: string): string {
  const h = normalizeHandle(handle);
  return h ? `@${h}` : '@';
}

/** Convenience: create a URL-safe path slug for this handle. */
export function handleToSlug(handle: string): string {
  return encodeURIComponent(normalizeHandle(handle));
}
