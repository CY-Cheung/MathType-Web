# AGENTS.md — AI Collaboration & Strict Guardrails

## 1. Non-Negotiable Architecture Rules (RED LINES)
- **NEVER build a custom 2D math layout engine, bounding-box renderer, or cursor movement system from scratch.** You MUST use `mathlive` (`<math-field>`) for all formula editing and rendering.
- **Pure Client-Side PWA Only:** Do NOT add any backend server, Node.js API, Office.js Add-in, or Windows OLE/COM code.
- **Explicit Non-Goals:** Do NOT attempt to implement double-click or hyperlink round-trip editing for Android Word (Android is strictly unidirectional copy-paste).

## 2. Tech Stack
- React 18+, TypeScript (strict mode), Vite, Tailwind CSS, `mathlive`, `lz-string`, `jszip` (Phase 3 only).

## 3. Coding & Workflow Discipline
- **Incremental Execution:** Follow the phased roadmap in `SPEC.md`. Complete ONLY the currently requested step. Do NOT jump ahead to later phases.
- **Modularity:** Keep all UI components single-responsibility and under 200 lines. Keep Word/clipboard/docx logic strictly inside `src/adapters/`.
- **Verification First:** Before declaring any step done, ensure `npm run build` / `npm run dev` passes with zero TypeScript errors.
- **Git Safety:** Do not overwrite unrelated files. Assume the user commits after each verified step.
