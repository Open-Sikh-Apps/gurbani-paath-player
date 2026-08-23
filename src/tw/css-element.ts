import { useCssElement } from "react-native-css";
import type { ReactElement } from "react";

export function useTwCssElement(
  component: Parameters<typeof useCssElement>[0],
  props: object,
  mapping: Record<string, string>,
): ReactElement {
  return useCssElement(component as never, props, mapping as never) as ReactElement;
}
