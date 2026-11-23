/** Low-level OOXML helpers for Phase 3 .docx scan / write-back. */

export const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const R_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
export const XML_NS = "http://www.w3.org/XML/1998/namespace";

export function uniqueElements(lists: Iterable<Element>[]): Element[] {
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

export function serializeXml(doc: Document): string {
  const xml = new XMLSerializer().serializeToString(doc);
  return xml.startsWith("<?xml") ? xml : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`;
}

export type TextSpan = { el: Element; start: number; end: number; text: string };

export function collectTextSpans(documentXml: string): { spans: TextSpan[]; merged: string; doc: Document } {
  const doc = new DOMParser().parseFromString(documentXml, "application/xml");
  const texts = uniqueElements([
    doc.getElementsByTagNameNS(W_NS, "t"),
    doc.getElementsByTagName("w:t"),
  ]);
  const spans: TextSpan[] = [];
  let offset = 0;
  for (const el of texts) {
    const text = el.textContent ?? "";
    spans.push({ el, start: offset, end: offset + text.length, text });
    offset += text.length;
  }
  return { spans, merged: spans.map((s) => s.text).join(""), doc };
}

/** Replace [start, end) in the merged text by editing underlying fragmented w:t nodes. */
export function replaceMergedRange(
  spans: TextSpan[],
  start: number,
  end: number,
  replacement: string,
): void {
  let wrote = false;
  for (const span of spans) {
    if (span.end <= start || span.start >= end) continue;
    const localStart = Math.max(0, start - span.start);
    const localEnd = Math.min(span.text.length, end - span.start);
    const prefix = span.text.slice(0, localStart);
    const suffix = span.text.slice(localEnd);
    if (!wrote) {
      const next = prefix + replacement + (span.end >= end ? suffix : "");
      span.el.textContent = next;
      if (/\s/.test(next)) span.el.setAttributeNS(XML_NS, "xml:space", "preserve");
      wrote = true;
    } else if (span.end >= end) {
      span.el.textContent = suffix;
    } else {
      span.el.textContent = "";
    }
    span.text = span.el.textContent ?? "";
  }
}

export function extractEqTargets(
  relsXml: string,
): { id: string; target: string; payload: string }[] {
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

export function updateRelsEqTarget(relsXml: string, relId: string, payload: string): string {
  const doc = new DOMParser().parseFromString(relsXml, "application/xml");
  const nodes = uniqueElements([
    doc.getElementsByTagNameNS(R_NS, "Relationship"),
    doc.getElementsByTagName("Relationship"),
  ]);
  let touched = false;
  for (const node of nodes) {
    if (node.getAttribute("Id") !== relId) continue;
    const target = node.getAttribute("Target") ?? "";
    const hash = target.indexOf("#eq=");
    if (hash < 0) continue;
    node.setAttribute("Target", `${target.slice(0, hash + 4)}${payload}`);
    touched = true;
  }
  if (!touched) throw new Error(`Relationship ${relId} not found for #eq= write-back`);
  return serializeXml(doc);
}
