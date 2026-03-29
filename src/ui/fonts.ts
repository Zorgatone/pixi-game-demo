const UI_FONT_NAME = "Roboto";
const DIALOGUE_FONT_NAME = "Chewy";

export const UI_FONT_FAMILY = `"${UI_FONT_NAME}", sans-serif`;
export const DIALOGUE_FONT_FAMILY = `"${DIALOGUE_FONT_NAME}", sans-serif`;

/**
 * Waits for the browser font-face to be ready before Pixi measures text.
 */
export async function loadUiFont(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  try {
    await Promise.all([
      document.fonts.load(`400 16px "${UI_FONT_NAME}"`),
      document.fonts.load(`700 16px "${UI_FONT_NAME}"`),
      document.fonts.load(`400 16px "${DIALOGUE_FONT_NAME}"`),
    ]);
  } catch (error) {
    console.warn(
      "Failed to preload Google Fonts, falling back to system fonts.",
      error,
    );
  }
}
