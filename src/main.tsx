import { MathfieldElement } from "mathlive";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensureStixTwoFonts } from "./styles/stix-two";
import { ensureTexGyreTermesFonts } from "./styles/tex-gyre-termes";
import "./styles/mathtype-10pt.css";
import { readDefineStylesPrefs, syncDefineStylesToRoot } from "./types/defineStyles";

ensureStixTwoFonts();
ensureTexGyreTermesFonts();
// Apply persisted Define Styles to :root before first paint.
syncDefineStylesToRoot(readDefineStylesPrefs());
MathfieldElement.fontsDirectory = `${import.meta.env.BASE_URL}vendor/mathlive/fonts`;
MathfieldElement.soundsDirectory = null;

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
