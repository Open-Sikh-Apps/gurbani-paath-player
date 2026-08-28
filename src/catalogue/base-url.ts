export function getCatalogueBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_CATALOGUE_BASE_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/+$/, "");
}
