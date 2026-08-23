import type { L10nText } from "@/types/catalogue";

export function resolveL10n(text: L10nText, locale: string): string {
  const exact = text[locale];
  if (exact) {
    return exact;
  }
  const language = locale.split("-")[0];
  const localized = language ? text[language] : undefined;
  if (localized) {
    return localized;
  }
  if (text.en) {
    return text.en;
  }
  const first = Object.values(text).find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return first ?? "";
}
