import { useEffect, useRef, useState, type RefObject } from "react";
import type { MathfieldElement } from "mathlive";
import {
  CHORD_STATUS,
  chordStart,
  chordTemplate,
  directTemplate,
  isModifierOnly,
  toMathliveTemplate,
  type ChordName,
} from "./shortcuts";

function insertTemplate(field: MathfieldElement, template: string): void {
  field.executeCommand(["insert", toMathliveTemplate(template)]);
}

/**
 * An unmatched second key cancels the chord. If that key would type a
 * character, it is also preventDefault'd so it does not land in the field.
 */
export function useMathShortcuts(fieldRef: RefObject<MathfieldElement | null>): {
  chordStatus: string;
} {
  const chordRef = useRef<ChordName | null>(null);
  const [chordStatus, setChordStatus] = useState("");

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const setChord = (next: ChordName | null) => {
      chordRef.current = next;
      setChordStatus(next ? CHORD_STATUS[next] : "");
    };

    const onKeyDown = (event: KeyboardEvent) => {
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
          insertTemplate(field, direct);
          return;
        }
        const template = chordTemplate(chord, event);
        if (event.key.length === 1 || template) {
          event.preventDefault();
          event.stopPropagation();
        }
        setChord(null);
        if (template) insertTemplate(field, template);
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
      insertTemplate(field, direct);
    };

    field.addEventListener("keydown", onKeyDown, true);
    return () => field.removeEventListener("keydown", onKeyDown, true);
  }, [fieldRef]);

  return { chordStatus };
}
