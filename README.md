# Equation editor

A pure client-side math editor in the style of MathType 6.9b. Formulas are edited and rendered by MathLive `<math-field>`. There is no server.

Phase 1, Step 1 shows one math field at the 10pt preset, Times New Roman, viewed at 200% zoom. The status bar reads `Style: Math | Size: Full (10pt) | Zoom: 200%`.

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on port 43123. `npm run dev` and `npm run build` copy MathLive's font files into `public/vendor/mathlive/fonts` first.

```bash
npx tsc --noEmit
npm run build
```

## Stack

Vite, React, TypeScript, Tailwind CSS, mathlive, lz-string.
