// lib/handles.ts
export function normalizeHandle(input = '') {
  // drop leading @, lower-case, trim spaces
  return input.replace(/^@+/, '').toLowerCase().trim();
}

// Matches contract rules: 3..32 chars, [a-z0-9._-]
export function isValidHandle(handle: string) {
  return /^[a-z0-9._-]{3,32}$/.test(handle);
}
