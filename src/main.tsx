import { MathfieldElement } from "mathlive";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/mathtype-10pt.css";

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
