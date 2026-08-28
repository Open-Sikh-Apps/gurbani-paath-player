import { FlashList as ShopifyFlashList, type FlashListProps } from "@shopify/flash-list";
import { Link as RouterLink } from "expo-router";
import React from "react";
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableHighlight as RNTouchableHighlight,
  View as RNView,
  type ViewStyle,
} from "react-native";
import {
  useNativeVariable as useFunctionalVariable,
} from "react-native-css";

import { fontFamilyForLocale, fontFamilyBoldForLocale } from "@/i18n/locales";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { useTwCssElement } from "@/tw/css-element";

export { cn } from "./cn";
export { Image } from "./image";
export { ui } from "./theme";

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string },
) => {
  return useTwCssElement(RouterLink, props, { className: "style" });
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps) => {
  return useTwCssElement(RNView, props, { className: "style" });
};
View.displayName = "CSS(View)";

type CssTextProps = React.ComponentProps<typeof RNText> & {
  className?: string;
};

export const Text = (props: CssTextProps) => {
  const locale = useResolvedLocale();
  const regular = fontFamilyForLocale(locale);
  const bold = fontFamilyBoldForLocale(locale);
  const flattened = StyleSheet.flatten(props.style);
  const weight = flattened?.fontWeight;
  const useBold =
    weight === "600" ||
    weight === "700" ||
    weight === "800" ||
    weight === "900" ||
    weight === "bold";
  const fontFamily = useBold && bold ? bold : regular;
  const nextStyle = fontFamily ? [{ fontFamily }, props.style] : props.style;

  return useTwCssElement(RNText, { ...props, style: nextStyle }, { className: "style" });
};
Text.displayName = "CSS(Text)";

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  },
) => {
  return useTwCssElement(RNScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
};
ScrollView.displayName = "CSS(ScrollView)";

// FlashList ignores contentContainerClassName unless mapped like ScrollView.
export function FlashList<TItem>(
  props: FlashListProps<TItem> & {
    className?: string;
    contentContainerClassName?: string;
  },
) {
  return useTwCssElement(ShopifyFlashList, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
}

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
) => {
  return useTwCssElement(RNPressable, props, { className: "style" });
};
Pressable.displayName = "CSS(Pressable)";

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string },
) => {
  return useTwCssElement(RNTextInput, props, { className: "style" });
};
TextInput.displayName = "CSS(TextInput)";

function XXTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>,
) {
  const flattened = (StyleSheet.flatten(props.style) ?? {}) as ViewStyle & {
    underlayColor?: string;
  };
  const { underlayColor, ...style } = flattened;
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor}
      {...props}
      style={style}
    />
  );
}

export const TouchableHighlight = (
  props: React.ComponentProps<typeof RNTouchableHighlight> & {
    className?: string;
  },
) => {
  return useTwCssElement(XXTouchableHighlight, props, { className: "style" });
};
TouchableHighlight.displayName = "CSS(TouchableHighlight)";
