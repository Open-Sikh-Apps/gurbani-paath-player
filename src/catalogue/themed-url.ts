import type { ThemedMediaUrl } from "@/catalogue/schema";
import type { ColorSchemeName } from "@/theme/colors";

export function pickThemedUrl(
  value: ThemedMediaUrl | undefined,
  scheme: ColorSchemeName,
): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  return value[scheme];
}
