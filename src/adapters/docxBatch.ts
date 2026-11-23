import JSZip from "jszip";
import { decompressFromEncodedURIComponent } from "lz-string";

/**
 * Phase 3 Step 1 — read / scan only (SPEC.md §4).
 * Detects:
 *   1. `#eq=` hyperlink targets in `word/_rels/document.xml.rels`
 *   2. TeX delimiters `$...$` and `\[...\]` in merged `w:t` text
 * Write-back / re-pack is deferred to later steps.
 */

export type FormulaKind = "eq-link" | "tex-inline" | "tex-display";

export type ScannedFormula = {
  id: string;
  index: number;
  kind: FormulaKind;
  /** Best-effort LaTeX for MathEditor preview. */
  latex: string;
  /** Short label for the list row. */
  summary: string;
  /** Raw XML / text snippet for inspection. */
  raw: string;
};

export type DocxScanResult = {
  fileName: string;
  formulas: ScannedFormula[];
  warnings: string[];
};

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

function truncate(text: string, max = 96): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length <= max ? one : `${one.slice(0, max - 1)}…`;
}

function decodeEqPayload(payload: string): { latex: string; warning?: string } {
  const raw = payload.trim();
  if (!raw) return { latex: "", warning: "Empty #eq= payload" };
  try {
    const decoded = decompressFromEncodedURIComponent(raw);
    if (decoded) return { latex: decoded };
  } catch {
    /* fall through */
  }
  try {
    const uri = decodeURIComponent(raw);
    if (uri && uri !== raw) return { latex: uri, warning: "Uncompressed #eq= payload" };
  } catch {
    /* ignore */
  }
  return { latex: raw, warning: "Could not lz-decode #eq=; showing raw payload" };
}

function uniqueElements(lists: Iterable<Element>[]): Element[] {
  const seen = new Set<Element>();
  const out: Element[] = [];
  for (const list of lists) {
    for (const node of list) {
      if (seen.has(node)) continue;
      seen.add(node);
      out.push(node);
    }
  }
  return out;
}

function extractEqTargets(relsXml: string): { id: string; target: string; payload: string }[] {
  const doc = new DOMParser().parseFromString(relsXml, "application/xml");
  const nodes = uniqueElements([
    doc.getElementsByTagNameNS(R_NS, "Relationship"),
    doc.getElementsByTagName("Relationship"),
  ]);
  const found: { id: string; target: string; payload: string }[] = [];
  for (const node of nodes) {
    const target = node.getAttribute("Target") ?? "";
    const hash = target.indexOf("#eq=");
    if (hash < 0) continue;
    found.push({
      id: node.getAttribute("Id") ?? `rId${found.length + 1}`,
      target,
      payload: target.slice(hash + 4),
    });
  }
  return found;
}

/** Concatenate every `w:t` in document order (SPEC: merge fragmented runs first). */
function mergedDocumentText(documentXml: string): string {
  const doc = new DOMParser().parseFromString(documentXml, "application/xml");
  const texts = uniqueElements([
    doc.getElementsByTagNameNS(W_NS, "t"),
    doc.getElementsByTagName("w:t"),
  ]);
  return texts.map((n) => n.textContent ?? "").join("");
}

type TexHit = { kind: "tex-inline" | "tex-display"; latex: string; raw: string; index: number };

function scanTexDelimiters(text: string): TexHit[] {
  const hits: TexHit[] = [];
  const display = /\\\[([\s\S]+?)\\\]/g;
  let match: RegExpExecArray | null;
  while ((match = display.exec(text))) {
    hits.push({
      kind: "tex-display",
      latex: match[1].trim(),
      raw: match[0],
      index: match.index,
    });
  }
  // Inline $...$ — skip $$ display pairs and escaped \$.
  const inline = /(^|[^\\$])\$([^\$\n]+?)\$/g;
  while ((match = inline.exec(text))) {
    const latex = match[2].trim();
    if (!latex) continue;
    hits.push({
      kind: "tex-inline",
      latex,
      raw: `$${match[2]}$`,
      index: match.index + match[1].length,
    });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits;
}

export async function scanDocxFile(file: File): Promise<DocxScanResult> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) throw new Error("Not a valid .docx (missing word/document.xml)");
  const documentXml = await documentFile.async("string");
  const relsFile = zip.file("word/_rels/document.xml.rels");
  const relsXml = relsFile ? await relsFile.async("string") : "";

  const formulas: ScannedFormula[] = [];
  let index = 0;

  for (const rel of extractEqTargets(relsXml)) {
    const decoded = decodeEqPayload(rel.payload);
    if (decoded.warning) warnings.push(`${rel.id}: ${decoded.warning}`);
    index += 1;
    formulas.push({
      id: `eq-${rel.id}`,
      index,
      kind: "eq-link",
      latex: decoded.latex,
      summary: truncate(decoded.latex || rel.payload),
      raw: truncate(rel.target, 160),
    });
  }

  const text = mergedDocumentText(documentXml);
  if (!text.trim()) warnings.push("document.xml has no readable w:t text");

  for (const hit of scanTexDelimiters(text)) {
    index += 1;
    formulas.push({
      id: `${hit.kind}-${hit.index}`,
      index,
      kind: hit.kind,
      latex: hit.latex,
      summary: truncate(hit.latex),
      raw: truncate(hit.raw, 160),
    });
  }

  return { fileName: file.name, formulas, warnings };
}

export function kindLabel(kind: FormulaKind): string {
  switch (kind) {
    case "eq-link":
      return "#eq= link";
    case "tex-inline":
      return "TeX $…$";
    case "tex-display":
      return "TeX \\[…\\]";
  }
}
