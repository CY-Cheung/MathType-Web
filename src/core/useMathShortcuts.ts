import { useEffect, useRef, useState, type RefObject } from "react";
import type { MathfieldElement } from "mathlive";
import { isAndroidUserAgent } from "../adapters/androidFnShortcuts";
import type { ActiveStyleId } from "../types/activeStyle";
import { insertAdaptedLatex } from "./insertAdapted";
import {
  CHORD_STATUS,
  chordStart,
  chordTemplate,
  directTemplate,
  isMatrixDialogShortcut,
  isModifierOnly,
  type ChordName,
} from "./shortcuts";

export type MathShortcutsOptions = {
  getActiveStyle?: () => ActiveStyleId;
  suppressModeLock?: { current: boolean };
};

/**
 * An unmatched second key cancels the chord. If that key would type a
 * character, it is also preventDefault'd so it does not land in the field.
 */
export function useMathShortcuts(
  fieldRef: RefObject<MathfieldElement | null>,
  onMatrixDialog?: () => void,
  options: MathShortcutsOptions = {},
): {
  chordStatus: string;
} {
  const chordRef = useRef<ChordName | null>(null);
  const [chordStatus, setChordStatus] = useState("");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // Desktop only — Android IME owns Ctrl/Alt chords; toolbar inserts instead.
    if (isAndroidUserAgent()) return;

    const field = fieldRef.current;
    if (!field) return;

    const insertTemplate = (template: string) => {
      const { getActiveStyle, suppressModeLock } = optionsRef.current;
      insertAdaptedLatex(field, template, {
        activeStyle: getActiveStyle?.() ?? "math",
        suppressModeLock,
      });
    };

    const setChord = (next: ChordName | null) => {
      chordRef.current = next;
      setChordStatus(next ? CHORD_STATUS[next] : "");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isMatrixDialogShortcut(event) && onMatrixDialog) {
        event.preventDefault();
        event.stopPropagation();
        setChord(null);
        onMatrixDialog();
        return;
      }

      const chord = chordRef.current;
      if (chord) {
        if (isModifierOnly(event)) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setChord(null);
          return;
        }
        const started = chordStart(event);
        if (started) {
          event.preventDefault();
          event.stopPropagation();
          setChord(started);
          return;
        }
        const direct = directTemplate(event);
        if (direct) {
          event.preventDefault();
          event.stopPropagation();
          setChord(null);
          insertTemplate(direct);
          return;
        }
        const template = chordTemplate(chord, event);
        if (event.key.length === 1 || template) {
          event.preventDefault();
          event.stopPropagation();
        }
        setChord(null);
        if (template) insertTemplate(template);
        return;
      }

      const started = chordStart(event);
      if (started) {
        event.preventDefault();
        event.stopPropagation();
        setChord(started);
        return;
      }
      const direct = directTemplate(event);
      if (!direct) return;
      event.preventDefault();
      event.stopPropagation();
      insertTemplate(direct);
    };

    field.addEventListener("keydown", onKeyDown, true);
    return () => field.removeEventListener("keydown", onKeyDown, true);
  }, [fieldRef, onMatrixDialog]);

  return { chordStatus };
}
