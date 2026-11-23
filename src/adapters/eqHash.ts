import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

/** Same codec as Phase 3 `#eq=` scan / write-back. */
export function encodeEqPayload(latex: string): string {
  return compressToEncodedURIComponent(latex.trim());
}

export function decodeEqPayload(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;
  try {
    const latex = decompressFromEncodedURIComponent(raw);
    return latex?.trim() ? latex : null;
  } catch {
    return null;
  }
}

/** `origin + pathname + #eq=<lz-string>` — SPEC Phase 2 round-trip URL. */
export function buildEqHref(latex: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#eq=${encodeEqPayload(latex)}`;
}

/** Parse `#eq=...` from `location.hash` or a full hash string. */
export function parseEqHash(hash: string): string | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!value.startsWith("eq=")) return null;
  return decodeEqPayload(value.slice(3));
}
