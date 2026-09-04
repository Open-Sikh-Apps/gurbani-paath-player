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
import { useThemeColors } from "@/theme/use-theme-colors";
import { useTwCssElement } from "@/tw/css-element";
import { cn } from "./cn";

export { cn };
export { Image } from "./image";
export { ui } from "./theme";

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string },
) => {
  return useTwCssElement(RouterLink, props, { className: "style" });
};

// The wrap is a new function; copy compound statics so <Link.Trigger> still works.
Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

// react-native-css functional variables are native-only; web reads the CSS custom property.
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
  const className = props.className ?? "";
  // NativeWind applies font-semibold via className after flatten, so Gurmukhi
  // would keep the regular face unless we also read the class list.
  const useBold =
    /\bfont-(semibold|bold|extrabold|black)\b/.test(className) ||
    weight === "600" ||
    weight === "700" ||
    weight === "800" ||
    weight === "900" ||
    weight === "bold";
  const fontFamily = useBold && bold ? bold : regular;
  const element = useTwCssElement(
    RNText,
    {
      ...props,
      className: regular
        ? cn(props.className, "leading-relaxed")
        : props.className,
      // Android clips Gurmukhi at the view edge; simple breaking keeps the last word.
      textBreakStrategy: regular ? "simple" : props.textBreakStrategy,
    },
    { className: "style" },
  ) as React.ReactElement<CssTextProps>;
  if (!fontFamily) {
    return element;
  }
  // NativeWind's className style is merged after `style`, so pin the face last. Extra pad so Gurmukhi glyphs do not clip at the view edge.
  return React.cloneElement(element, {
    style: [
      element.props.style,
      {
        fontFamily,
        paddingBottom: 4,
        paddingEnd: 8,
      },
    ],
  });
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
export const FlashList = React.forwardRef(function FlashList<TItem>(
  props: FlashListProps<TItem> & {
    className?: string;
    contentContainerClassName?: string;
  },
  ref: React.Ref<unknown>,
) {
  return useTwCssElement(
    ShopifyFlashList,
    { ...props, ref },
    {
      className: "style",
      contentContainerClassName: "contentContainerStyle",
    },
  );
}) as typeof ShopifyFlashList;

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
) => {
  const { style, ...rest } = props;
  const colors = useThemeColors();
  return useTwCssElement(
    RNPressable,
    {
      ...rest,
      // Theme the ripple; the default gray reads as a flash on dark surfaces.
      android_ripple: { color: colors.accent, alpha: 0.2 },
      // style: (state: PressableStateCallbackType) => {
      //   const extra = typeof style === "function" ? style(state) : style;
      //   return [
      //     extra,
      //     state.pressed ? { opacity: 0.72 } : null,
      //   ];
      // },
    },
    { className: "style" },
  );
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
  // NativeWind puts underlayColor on style; RN only honors the prop.
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
