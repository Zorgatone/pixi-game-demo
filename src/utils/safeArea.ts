/**
 * Reads a CSS safe-area custom property and returns the resolved pixel value.
 */
export function getSafeAreaInsetPx(variableName: string): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
