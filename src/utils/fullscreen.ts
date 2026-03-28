type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/**
 * Returns whether the current browser exposes any supported fullscreen API.
 */
export function isFullscreenSupported(): boolean {
  const element = document.documentElement as FullscreenCapableElement;
  const fullscreenDocument = document as FullscreenCapableDocument;

  return !!(
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    fullscreenDocument.exitFullscreen ||
    fullscreenDocument.webkitExitFullscreen
  );
}

/**
 * Checks both standard and WebKit-prefixed fullscreen state.
 */
export function isFullscreenActive(): boolean {
  const fullscreenDocument = document as FullscreenCapableDocument;

  return (
    document.fullscreenElement !== null ||
    fullscreenDocument.webkitFullscreenElement !== null
  );
}

/**
 * Toggles fullscreen using the standard API with a WebKit fallback for Safari.
 */
export async function toggleFullscreen(
  target: HTMLElement = document.documentElement,
): Promise<void> {
  const element = target as FullscreenCapableElement;
  const fullscreenDocument = document as FullscreenCapableDocument;

  if (isFullscreenActive()) {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }

    if (fullscreenDocument.webkitExitFullscreen) {
      await fullscreenDocument.webkitExitFullscreen();
    }

    return;
  }

  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }

  await element.webkitRequestFullscreen?.();
}
