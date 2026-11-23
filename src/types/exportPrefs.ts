/**
 * Word PNG paste preferences (clipboard HTML shape).
 * Persisted separately from Define Styles / workspace zoom.
 */

export const PLAIN_IMAGE_NO_LINK_STORAGE_KEY = "mt-export-plain-image-no-link";

/** Default ON — Word paste without blue hyperlink underline. */
export const DEFAULT_PLAIN_IMAGE_NO_LINK = true;

export function readPlainImageNoLink(): boolean {
  if (typeof localStorage === "undefined") return DEFAULT_PLAIN_IMAGE_NO_LINK;
  try {
    const raw = localStorage.getItem(PLAIN_IMAGE_NO_LINK_STORAGE_KEY);
    if (raw == null || raw === "") return DEFAULT_PLAIN_IMAGE_NO_LINK;
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
    return DEFAULT_PLAIN_IMAGE_NO_LINK;
  } catch {
    return DEFAULT_PLAIN_IMAGE_NO_LINK;
  }
}

export function writePlainImageNoLink(value: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PLAIN_IMAGE_NO_LINK_STORAGE_KEY, value ? "true" : "false");
  } catch {
    /* private mode / quota */
  }
}
