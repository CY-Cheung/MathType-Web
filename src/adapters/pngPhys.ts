/**
 * PNG `pHYs` (physical pixel dimensions) helpers for Word High-DPI paste.
 * 384 DPI ≈ 4× screen (96 DPI) so a 4× raster displays at 10pt without soft upscaling.
 */

/** Target Word / CF_HTML bitmap density (4 × 96 DPI). */
export const EXPORT_PNG_DPI = 384;

/** pixels/meter for 384 DPI: round(384 / 0.0254). */
export const EXPORT_PNG_PIXELS_PER_METER = Math.round(EXPORT_PNG_DPI / 0.0254); // 15118

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10] as const;

/** CRC-32 (ISO 3309 / PNG) over type+data. */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIG[i]) return false;
  return true;
}

/** Build a `pHYs` chunk for square DPI (unit = meter). */
export function buildPhysChunk(pixelsPerMeter = EXPORT_PNG_PIXELS_PER_METER): Uint8Array {
  const type = new TextEncoder().encode("pHYs");
  const data = new Uint8Array(9);
  data.set(u32be(pixelsPerMeter), 0);
  data.set(u32be(pixelsPerMeter), 4);
  data[8] = 1; // unit = meter
  const crcBody = concat([type, data]);
  return concat([u32be(9), type, data, u32be(crc32(crcBody))]);
}

/**
 * Insert or replace `pHYs` immediately after `IHDR`.
 * Returns a new buffer; unchanged if input is not a PNG.
 */
export function setPngPhysDpi(
  png: Uint8Array,
  dpi: number = EXPORT_PNG_DPI,
): Uint8Array {
  if (!isPng(png)) return png;
  const ppm = Math.round(dpi / 0.0254);
  const phys = buildPhysChunk(ppm);

  // Walk chunks; drop existing pHYs; insert after IHDR.
  const out: Uint8Array[] = [png.subarray(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= png.length) {
    const length =
      ((png[offset]! << 24) | (png[offset + 1]! << 16) | (png[offset + 2]! << 8) | png[offset + 3]!) >>>
      0;
    const type = String.fromCharCode(
      png[offset + 4]!,
      png[offset + 5]!,
      png[offset + 6]!,
      png[offset + 7]!,
    );
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > png.length) break;
    const chunk = png.subarray(offset, chunkEnd);
    if (type === "pHYs") {
      offset = chunkEnd;
      continue;
    }
    out.push(chunk);
    if (type === "IHDR" && !inserted) {
      out.push(phys);
      inserted = true;
    }
    offset = chunkEnd;
    if (type === "IEND") break;
  }
  if (!inserted) {
    // Malformed / unexpected — append before last chunk if possible.
    out.push(phys);
  }
  return concat(out);
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = dataUrl.includes(";base64,") ? atob(payload) : decodeURIComponent(payload);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToPngDataUrl(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/png;base64,${btoa(bin)}`;
}

/** Read pHYs pixels/meter (x) if present; else null. */
export function readPngPhysPpm(png: Uint8Array): number | null {
  if (!isPng(png)) return null;
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length =
      ((png[offset]! << 24) | (png[offset + 1]! << 16) | (png[offset + 2]! << 8) | png[offset + 3]!) >>>
      0;
    const type = String.fromCharCode(
      png[offset + 4]!,
      png[offset + 5]!,
      png[offset + 6]!,
      png[offset + 7]!,
    );
    if (type === "pHYs" && length >= 9) {
      const d = offset + 8;
      return (
        ((png[d]! << 24) | (png[d + 1]! << 16) | (png[d + 2]! << 8) | png[d + 3]!) >>> 0
      );
    }
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return null;
}
