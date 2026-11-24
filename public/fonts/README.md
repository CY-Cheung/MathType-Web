# Self-hosted fonts

## STIX Two Text / Math (default open fallback)

SIL Open Font License 1.1 — see `OFL-STIX.txt`.

| Face | Files |
|------|--------|
| STIX Two Text | `stix-two-text-{latin,greek}-{400,700}-{normal,italic}.woff2` |
| STIX Two Math | `stix-two-math-latin-400-normal.woff2` |

Sourced from [`@fontsource/stix-two-text`](https://www.npmjs.com/package/@fontsource/stix-two-text) /
[`@fontsource/stix-two-math`](https://www.npmjs.com/package/@fontsource/stix-two-math)
via `scripts/copy-stix-fonts.mjs` (also run from `predev` / `prebuild`).

Default letter stack: **Times New Roman → STIX Two Text → STIX Two Math → serif**.
Windows uses local Times New Roman; Android and other environments without TNR
render STIX Two. No commercial MathType / Euclid / Symbol Tiger faces are
shipped.

## TeX Gyre Termes (optional Define Styles pick)

Times-compatible OpenType faces from the [TeX Gyre](https://www.gust.org.pl/projects/e-foundry/tex-gyre)
project (CTAN: `fonts/tex-gyre`). Licensed under the GUST Font License — see
`GUST-FONT-LICENSE.txt`.
