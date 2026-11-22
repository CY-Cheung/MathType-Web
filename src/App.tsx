import { useRef, useState } from "react";
import { MathEditor, type MathEditorHandle } from "./components/MathEditor";
import { FavoritesBar } from "./components/FavoritesBar";
import { Toolbar } from "./components/Toolbar";
import { STATUS_BAR_LABEL } from "./types/preset";

export default function App() {
  const editorRef = useRef<MathEditorHandle>(null);
  const [chordStatus, setChordStatus] = useState("");

  return (
    <div className="flex h-dvh flex-col bg-[#d4d4d4] sm:p-4">
      <div className="flex min-h-0 flex-1 flex-col border border-[#b4b4b4] bg-white shadow-sm">
        <Toolbar onInsert={(latex) => editorRef.current?.insert(latex)} />
        <FavoritesBar
          onInsert={(latex) => editorRef.current?.insert(latex)}
          onCapture={() => editorRef.current?.capture() ?? ""}
        />
        <main className="relative min-h-0 flex-1">
          <MathEditor ref={editorRef} onChordStatus={setChordStatus} />
        </main>
        <footer className="border-t border-[#c6c6c6] bg-[#f3f3f3] px-2 py-1.5 font-sans text-[12px] leading-snug text-[#1a1a1a]">
          {chordStatus || STATUS_BAR_LABEL}
        </footer>
      </div>
    </div>
  );
}
