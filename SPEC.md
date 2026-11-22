# SPEC.md — Modern MathType 6.9b Clone (Pure Web / PWA)

## 1. Product Positioning
- **Windows / Mac Desktop Word (Bidirectional):** Edit in browser -> Copy 4x High-DPI PNG wrapped in `<a>` hyperlink with dynamic `vertical-align` baseline offset -> Paste into Word -> `Ctrl/Cmd + Click` image in Word to reopen and edit the exact formula.
- **Android Word (Unidirectional):** Quick mobile/tablet editing -> Copy High-DPI PNG -> Paste into Word.

## 2. Typography, Sizes & Workspace Preferences (Exact 6.9b Match)
- **Sizes (`src/types/preset.ts`):** Full `10pt`, Subscript/Superscript `7pt`, Sub-Subscript/Superscript `5pt`, Symbol `18pt`, Sub-symbol `12pt`, User 1 `75%`, User 2 `150%`.
- **Styles:**
  - Text / Function / Number: `Times New Roman` (upright)
  - Text (FE / Chinese): `PMingLiU` (新細明體, with web fallbacks)
  - Variable: `Times New Roman` (italic)
  - Vector-Matrix: `Times New Roman` (bold)
  - L.C. & U.C. Greek: `Symbol` (italic, with math font fallbacks)
  - User 1: `Courier New`
- **Workspace Visuals (`src/styles/mathtype-10pt.css`):**
  - Default editor zoom: **200%** (`--mt-editor-zoom: 2.0`); export PNG at 100% (`10pt`).
  - Selection color: Cyan (`#80ffff`); Empty slots: Green dashed box (`#008000`).
  - Direct TeX keyboard entry: Off by default (toggleable).
  - Status bar (bottom): Hovered button name + shortcut hint, plus `Style | Size | Zoom: 200%`.

## 3. UI Layout & Core Features
1. **Row 1 — Symbol Palettes:** 10 categorized dropdown grids (`src/data/toolbar.ts`).
2. **Row 2 — Template Palettes:** 10 categorized dropdown grids (includes trigger for Custom Matrix Dialog).
3. **Row 3 — Small Bar:** Quick-insert single row of high-frequency symbols & templates.
4. **Row 4 — Tabbed Favorites Bar:** Tabs (`Algebra`, `Derivs`, `Statistics`, `Matrices`, `Sets`, `Trig`, `Geometry`, `Tab 8`, `Tab 9`) persisted in `localStorage`.
5. **Main Canvas:** `<math-field>` with Shadow DOM CSS injection for Times New Roman variables (`.ML__mathit`, `.ML__cmr`, `.ML__mathbf`, `.ML__placeholder`).
6. **Custom Matrix Dialog (`src/components/MatrixDialog.tsx`):** Rows/columns, equal widths/heights, column alignment (`Left`, `Center`, `Right`, `At =`, `At .`), row alignment (`Top`, `Baseline`, `Bottom`), clickable solid/dashed partition lines compiled to `\begin{array}{...}`.
7. **Keyboard Shortcuts (`src/core/shortcuts.ts`):** Direct shortcuts (`Ctrl+F`, `Ctrl+R`, `Ctrl+H`, `Ctrl+L`, `Ctrl+J`, `Ctrl+9`, `Ctrl+[`, etc.) and chorded shortcuts (`Ctrl+G` Greek, `Ctrl+K` Symbols, `Alt+T` Templates). Must call `e.preventDefault()`.

## 4. Export & Batch `.docx` Processor
- **Phase 2 (`src/adapters/clipboard.ts`):** 4x scale High-DPI PNG locked to physical 10pt dimensions, dynamic baseline depth measurement (`px * 0.75` -> `vertical-align: -Xpt`), `lz-string` URL hash `#eq=...`, PWA manifest.
- **Phase 3 (`src/adapters/docxBatch.ts`):** Client-side `JSZip` drag-and-drop processor:
  - **Format Equations:** Scan `word/_rels/document.xml.rels` for `#eq=` -> decode LaTeX -> re-render PNGs with new `StylePreset` -> overwrite `word/media/` and XML dimensions/baseline.
  - **Toggle TeX:** Merge fragmented adjacent `<w:r>` XML text nodes first -> convert `$ ... $` and `\[ ... \]` to 10pt PNG formulas + `#eq=` hyperlinks.

## 5. Phased Roadmap (STOP after each step for verification)
- **Phase 1:** (1) 10pt空殼與 Times New Roman 渲染 -> (2) 快捷鍵與組合鍵 -> (3) 上方雙層分類工具列 -> (4) 下方常用公式列與 `localStorage` -> (5) JSON 樣式切換與矩陣對話框。
- **Phase 2:** 4x PNG 匯出、自動基線對齊、`lz-string` 回跳、PWA 部署。
- **Phase 3:** `JSZip` `.docx` 批量改字號與 Toggle TeX。
