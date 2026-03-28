const MUSIC_COOKIE_NAME = "pixi-game-demo-music-enabled";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readMusicEnabledPreference(): boolean {
  const cookiePrefix = `${MUSIC_COOKIE_NAME}=`;

  for (const cookie of document.cookie.split(";")) {
    const trimmedCookie = cookie.trim();

    if (!trimmedCookie.startsWith(cookiePrefix)) {
      continue;
    }

    return trimmedCookie.slice(cookiePrefix.length) !== "false";
  }

  return true;
}

export function writeMusicEnabledPreference(isEnabled: boolean): void {
  document.cookie = [
    `${MUSIC_COOKIE_NAME}=${String(isEnabled)}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ].join("; ");
}
