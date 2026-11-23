import JSZip from "jszip";
import { decodeEqPayload, encodeEqPayload } from "./eqHash";
import {
  collectTextSpans,
  extractEqTargets,
  replaceMergedRange,
  serializeXml,
  updateRelsEqTarget,
  R_NS,
  uniqueElements,
} from "./docxXml";
import { renderFormulaPng } from "./renderFormula";

/**
 * Phase 3 Step 2 — scan + edit write-back + re-pack (SPEC.md §4).
 * `#eq=` → re-encode lz-string in rels (+ best-effort media PNG refresh).
 * `$...$` / `\[...\]` → rewrite delimiter text across fragmented `w:t` runs.
 */

export type FormulaKind = "eq-link" | "tex-inline" | "tex-display";

export type ScannedFormula = {
  id: string;
  index: number;
  kind: FormulaKind;
  latex: string;
  summary: string;
  raw: string;
  modified: boolean;
  originalLatex: string;
  textStart?: number;
  textEnd?: number;
  relId?: string;
};

export type DocxSession = {
  fileName: string;
  zip: JSZip;
  documentXml: string;
  relsXml: string;
  formulas: ScannedFormula[];
  warnings: string[];
};

function truncate(text: string, max = 96): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length <= max ? one : `${one.slice(0, max - 1)}…`;
}

function decodeEqForScan(payload: string): { latex: string; warning?: string } {
  const latex = decodeEqPayload(payload);
  if (latex) return { latex };
  if (!payload.trim()) return { latex: "", warning: "Empty #eq= payload" };
  try {
    const uri = decodeURIComponent(payload.trim());
    if (uri) return { latex: uri, warning: "Uncompressed #eq= payload" };
  } catch {
    /* ignore */
  }
  return { latex: payload.trim(), warning: "Could not lz-decode #eq=; showing raw payload" };
}

type TexHit = {
  kind: "tex-inline" | "tex-display";
  latex: string;
  raw: string;
  index: number;
  end: number;
};

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
      end: match.index + match[0].length,
    });
  }
  const inline = /(^|[^\\$])\$([^\$\n]+?)\$/g;
  while ((match = inline.exec(text))) {
    const latex = match[2].trim();
    if (!latex) continue;
    const raw = `$${match[2]}$`;
    const index = match.index + match[1].length;
    hits.push({ kind: "tex-inline", latex, raw, index, end: index + raw.length });
  }
  return hits.sort((a, b) => a.index - b.index);
}

function wrapTex(kind: "tex-inline" | "tex-display", latex: string): string {
  return kind === "tex-inline" ? `$${latex}$` : `\\[${latex}\\]`;
}

export async function openDocxSession(file: File): Promise<DocxSession> {
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
    const decoded = decodeEqForScan(rel.payload);
    if (decoded.warning) warnings.push(`${rel.id}: ${decoded.warning}`);
    index += 1;
    formulas.push({
      id: `eq-${rel.id}`,
      index,
      kind: "eq-link",
      latex: decoded.latex,
      summary: truncate(decoded.latex || rel.payload),
      raw: truncate(rel.target, 120),
      modified: false,
      originalLatex: decoded.latex,
      relId: rel.id,
    });
  }

  const { merged } = collectTextSpans(documentXml);
  if (!merged.trim()) warnings.push("document.xml has no readable w:t text");

  for (const hit of scanTexDelimiters(merged)) {
    index += 1;
    formulas.push({
      id: `${hit.kind}-${hit.index}`,
      index,
      kind: hit.kind,
      latex: hit.latex,
      summary: truncate(hit.latex),
      raw: truncate(hit.raw, 120),
      modified: false,
      originalLatex: hit.latex,
      textStart: hit.index,
      textEnd: hit.end,
    });
  }

  return { fileName: file.name, zip, documentXml, relsXml, formulas, warnings };
}

export async function scanDocxFile(file: File) {
  const session = await openDocxSession(file);
  return { fileName: session.fileName, formulas: session.formulas, warnings: session.warnings };
}

export function applyFormulaEdit(
  session: DocxSession,
  formulaId: string,
  nextLatex: string,
): DocxSession {
  const latex = nextLatex.trim();
  if (!latex) throw new Error("Nothing to apply");
  const formulas = session.formulas.map((f) => {
    if (f.id !== formulaId) return f;
    return {
      ...f,
      latex,
      summary: truncate(latex),
      modified: latex !== f.originalLatex,
      raw:
        f.kind === "eq-link"
          ? truncate(`#eq=${encodeEqPayload(latex)}`, 120)
          : truncate(wrapTex(f.kind, latex), 120),
    };
  });
  return { ...session, formulas };
}

function updateDocumentTex(
  documentXml: string,
  mods: { start: number; end: number; kind: "tex-inline" | "tex-display"; latex: string }[],
): string {
  const { spans, doc } = collectTextSpans(documentXml);
  for (const mod of [...mods].sort((a, b) => b.start - a.start)) {
    replaceMergedRange(spans, mod.start, mod.end, wrapTex(mod.kind, mod.latex));
  }
  return serializeXml(doc);
}

async function refreshEqMedia(zip: JSZip, relsXml: string, latex: string): Promise<void> {
  const relsDoc = new DOMParser().parseFromString(relsXml, "application/xml");
  const imageRels = uniqueElements([
    relsDoc.getElementsByTagNameNS(R_NS, "Relationship"),
    relsDoc.getElementsByTagName("Relationship"),
  ]).filter((n) => (n.getAttribute("Type") ?? "").includes("/image"));
  if (imageRels.length === 0) return;
  const png = await renderFormulaPng(latex, 4);
  const target = imageRels[0]?.getAttribute("Target");
  if (!target) return;
  const path = target.startsWith("/") ? target.slice(1) : `word/${target.replace(/^\.\.\//, "")}`;
  zip.file(path.includes("word/") ? path : `word/${path}`, png.blob);
}

export async function exportDocxSession(session: DocxSession): Promise<Blob> {
  const modified = session.formulas.filter((f) => f.modified);
  if (modified.length === 0) throw new Error("No modifications to export");

  let relsXml = session.relsXml;
  let documentXml = session.documentXml;

  for (const f of modified) {
    if (f.kind === "eq-link" && f.relId) {
      relsXml = updateRelsEqTarget(relsXml, f.relId, encodeEqPayload(f.latex));
    }
  }

  const texMods = modified
    .filter(
      (f): f is ScannedFormula & { textStart: number; textEnd: number; kind: "tex-inline" | "tex-display" } =>
        (f.kind === "tex-inline" || f.kind === "tex-display") &&
        typeof f.textStart === "number" &&
        typeof f.textEnd === "number",
    )
    .map((f) => ({ start: f.textStart, end: f.textEnd, kind: f.kind, latex: f.latex }));
  if (texMods.length) documentXml = updateDocumentTex(documentXml, texMods);

  session.zip.file("word/document.xml", documentXml);
  if (relsXml) session.zip.file("word/_rels/document.xml.rels", relsXml);

  for (const f of modified) {
    if (f.kind !== "eq-link") continue;
    try {
      await refreshEqMedia(session.zip, relsXml, f.latex);
    } catch {
      /* best-effort Format Equations media refresh */
    }
  }

  return session.zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
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

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/\.docx$/i, "")}-updated.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
