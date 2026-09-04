export function getMediaBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.trim();
  if (!raw) {
    return null;
  }
  // Strip trailing slashes so `${base}${path}` does not become `https://cdn//audio/…`.
  return raw.replace(/\/+$/, "");
}
