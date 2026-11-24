/**
 * Browser-local font imports — IndexedDB only (never uploaded).
 * Boot-loads FontFace into document.fonts; caches Base64 @font-face CSS for PNG/SVG export.
 */

export type LocalFontWeight = "400" | "700";
export type LocalFontStyle = "normal" | "italic";
export type LocalFontFormat = "truetype" | "opentype" | "woff" | "woff2";

export type LocalFontRecord = {
  id: string;
  family: string;
  weight: LocalFontWeight;
  style: LocalFontStyle;
  format: LocalFontFormat;
  fileName: string;
  buffer: ArrayBuffer;
  addedAt: number;
};

/** List row without the binary payload. */
export type LocalFontMeta = Omit<LocalFontRecord, "buffer">;

const DB_NAME = "mt-local-fonts";
const DB_VERSION = 1;
const STORE = "fonts";

type InferResult = {
  family: string;
  weight: LocalFontWeight;
  style: LocalFontStyle;
  format: LocalFontFormat;
};

/** Map common MathType / Windows filenames → family + face. */
export function inferFontMeta(fileName: string): InferResult {
  const base = fileName.replace(/^.*[/\\]/, "");
  const stem = base.replace(/\.(ttf|otf|woff2?)$/i, "");
  const lower = stem.toLowerCase().replace(/[\s_-]+/g, "");
  const format = formatFromFileName(base);

  // Euclid: euclid / euclidb / euclidi / euclidbi (and long forms).
  // Order matters — plain `euclid` must not match the bi/b/i suffixes.
  if (/^euclid(bi|bolditalic|bolditalics)$/.test(lower)) {
    return { family: "Euclid", weight: "700", style: "italic", format };
  }
  if (/^euclid(b|bold)$/.test(lower)) {
    return { family: "Euclid", weight: "700", style: "normal", format };
  }
  if (/^euclid(i|italic|italics)$/.test(lower)) {
    return { family: "Euclid", weight: "400", style: "italic", format };
  }
  if (/^euclid$/.test(lower)) {
    return { family: "Euclid", weight: "400", style: "normal", format };
  }

  // Times New Roman: times / timesbd / timesi / timesbi / timesnewroman*
  if (
    /^(times(bi|bdit|bolditalic)|timesnewroman(bi|bolditalic)|tnr(bi|bolditalic))$/.test(
      lower,
    )
  ) {
    return { family: "Times New Roman", weight: "700", style: "italic", format };
  }
  if (/^(times(bd|b|bold)|timesnewroman(bd|bold)|tnr(bd|bold))$/.test(lower)) {
    return { family: "Times New Roman", weight: "700", style: "normal", format };
  }
  if (/^(times(i|italic)|timesnewroman(i|italic)|tnr(i|italic))$/.test(lower)) {
    return { family: "Times New Roman", weight: "400", style: "italic", format };
  }
  if (/^(times|timesnewroman|tnr)$/.test(lower)) {
    return { family: "Times New Roman", weight: "400", style: "normal", format };
  }

  // Generic: stem as family; sniff bold/italic tokens in the name.
  let weight: LocalFontWeight = "400";
  let style: LocalFontStyle = "normal";
  if (/bolditalic|blackitalic|bi$/i.test(stem) || /bold.*italic|italic.*bold/i.test(stem)) {
    weight = "700";
    style = "italic";
  } else if (/\bbold\b|bd$|_b$/i.test(stem)) {
    weight = "700";
  } else if (/\bitalic\b|it$|_i$/i.test(stem)) {
    style = "italic";
  }
  const family = stem
    .replace(/[-_]?(bolditalic|bold|italic|regular|bi|bd|it)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim() || stem;
  return { family, weight, style, format };
}

export function formatFromFileName(fileName: string): LocalFontFormat {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "otf") return "opentype";
  return "truetype";
}

function mimeForFormat(format: LocalFontFormat): string {
  switch (format) {
    case "woff2":
      return "font/woff2";
    case "woff":
      return "font/woff";
    case "opentype":
      return "font/otf";
    default:
      return "font/ttf";
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toMeta(record: LocalFontRecord): LocalFontMeta {
  const { buffer: _buffer, ...meta } = record;
  return meta;
}

/** Live FontFace instances keyed by record id (for document.fonts.delete). */
const loadedFaces = new Map<string, FontFace>();

let embedCssCache: string | null = null;
let embedCssPromise: Promise<string> | null = null;

export function invalidateLocalFontEmbedCache(): void {
  embedCssCache = null;
  embedCssPromise = null;
}

export async function listLocalFonts(): Promise<LocalFontMeta[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const rows = (await idbReq(tx.objectStore(STORE).getAll())) as LocalFontRecord[];
    db.close();
    return rows
      .map(toMeta)
      .sort((a, b) => a.family.localeCompare(b.family) || a.fileName.localeCompare(b.fileName));
  } catch {
    return [];
  }
}

export async function getAllLocalFonts(): Promise<LocalFontRecord[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const rows = (await idbReq(tx.objectStore(STORE).getAll())) as LocalFontRecord[];
    db.close();
    return rows;
  } catch {
    return [];
  }
}

/** Distinct family names currently stored (for Define Styles presets). */
export async function listLocalFontFamilies(): Promise<string[]> {
  const metas = await listLocalFonts();
  const set = new Set(metas.map((m) => m.family));
  return [...set].sort((a, b) => a.localeCompare(b));
}

async function putRecord(record: LocalFontRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  await idbReq(tx.objectStore(STORE).put(record));
  db.close();
  invalidateLocalFontEmbedCache();
}

async function registerFace(record: LocalFontRecord): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  // Drop previous face for this id (re-import / replace).
  const prev = loadedFaces.get(record.id);
  if (prev) {
    try {
      document.fonts.delete(prev);
    } catch {
      /* ignore */
    }
    loadedFaces.delete(record.id);
  }
  try {
    const face = new FontFace(record.family, record.buffer.slice(0), {
      weight: record.weight,
      style: record.style,
      display: "swap",
    });
    await face.load();
    document.fonts.add(face);
    loadedFaces.set(record.id, face);
  } catch {
    /* corrupt buffer / unsupported format */
  }
}

export async function addLocalFontFromFile(file: File): Promise<LocalFontMeta> {
  const inferred = inferFontMeta(file.name);
  const buffer = await file.arrayBuffer();
  const record: LocalFontRecord = {
    id: newId(),
    family: inferred.family,
    weight: inferred.weight,
    style: inferred.style,
    format: inferred.format,
    fileName: file.name.replace(/^.*[/\\]/, ""),
    buffer,
    addedAt: Date.now(),
  };
  await putRecord(record);
  await registerFace(record);
  return toMeta(record);
}

export async function importLocalFontFiles(files: FileList | File[]): Promise<LocalFontMeta[]> {
  const list = [...files].filter((f) => /\.(ttf|otf|woff2?)$/i.test(f.name));
  const added: LocalFontMeta[] = [];
  for (const file of list) {
    added.push(await addLocalFontFromFile(file));
  }
  return added;
}

export async function deleteLocalFont(id: string): Promise<void> {
  const face = loadedFaces.get(id);
  if (face && typeof document !== "undefined") {
    try {
      document.fonts.delete(face);
    } catch {
      /* ignore */
    }
    loadedFaces.delete(id);
  }
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).delete(id));
    db.close();
  } catch {
    /* ignore */
  }
  invalidateLocalFontEmbedCache();
}

export async function clearLocalFonts(): Promise<void> {
  for (const [id, face] of loadedFaces) {
    if (typeof document !== "undefined") {
      try {
        document.fonts.delete(face);
      } catch {
        /* ignore */
      }
    }
    loadedFaces.delete(id);
  }
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).clear());
    db.close();
  } catch {
    /* ignore */
  }
  invalidateLocalFontEmbedCache();
}

/** Boot / resume: load every stored face into document.fonts. */
export async function loadLocalFontsIntoDocument(): Promise<void> {
  if (typeof document === "undefined") return;
  const rows = await getAllLocalFonts();
  await Promise.all(rows.map((row) => registerFace(row)));
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function faceEmbedRule(record: LocalFontRecord, dataUri: string): string {
  return `@font-face {
  font-family: ${JSON.stringify(record.family)};
  src: url(${JSON.stringify(dataUri)}) format(${JSON.stringify(record.format)});
  font-weight: ${record.weight};
  font-style: ${record.style};
  font-display: swap;
}`;
}

/**
 * Base64 `@font-face` CSS for export foreignObject.
 * When `families` is set, only those family names are embedded (case-sensitive trim).
 */
export async function getLocalFontEmbedCss(
  families?: readonly string[],
): Promise<string> {
  if (typeof document === "undefined") return "";
  const filter =
    families && families.length > 0
      ? new Set(families.map((f) => f.trim()).filter(Boolean))
      : null;

  // Full unfiltered CSS is cached; filtered builds from records each time (cheap vs encode).
  if (!filter) {
    if (embedCssCache != null) return embedCssCache;
    if (!embedCssPromise) {
      embedCssPromise = (async () => {
        const rows = await getAllLocalFonts();
        const rules = rows.map((row) => {
          const b64 = bytesToBase64(row.buffer);
          const data = `data:${mimeForFormat(row.format)};base64,${b64}`;
          return faceEmbedRule(row, data);
        });
        const css = rules.join("\n\n");
        embedCssCache = css;
        return css;
      })().catch(() => {
        embedCssPromise = null;
        return "";
      });
    }
    return embedCssPromise;
  }

  const rows = await getAllLocalFonts();
  const matched = rows.filter((row) => filter.has(row.family));
  if (matched.length === 0) return "";
  return matched
    .map((row) => {
      const b64 = bytesToBase64(row.buffer);
      const data = `data:${mimeForFormat(row.format)};base64,${b64}`;
      return faceEmbedRule(row, data);
    })
    .join("\n\n");
}

/** Warm document.fonts.load for each stored face (export path). */
export async function warmLocalFonts(sizePt = 10): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const metas = await listLocalFonts();
  await Promise.all(
    metas.map((meta) => {
      const italic = meta.style === "italic" ? "italic " : "";
      const bold = meta.weight === "700" ? "bold " : "";
      return document.fonts
        .load(`${italic}${bold}${sizePt}pt ${JSON.stringify(meta.family)}`)
        .catch(() => [] as FontFace[]);
    }),
  );
}
