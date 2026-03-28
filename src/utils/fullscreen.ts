type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

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

export function isFullscreenActive(): boolean {
  const fullscreenDocument = document as FullscreenCapableDocument;

  return (
    document.fullscreenElement !== null ||
    fullscreenDocument.webkitFullscreenElement !== null
  );
}

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
