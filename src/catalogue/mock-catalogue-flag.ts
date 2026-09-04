const TRUTHY = new Set(["1", "true", "yes"]);

/** Bundled mock only. Not tied to __DEV__, so Metro can still fetch Pages when this is unset. */
export function shouldUseMockCatalogue(): boolean {
  const raw = process.env.EXPO_PUBLIC_USE_MOCK_CATALOGUE?.trim().toLowerCase();
  return raw != null && TRUTHY.has(raw);
}
