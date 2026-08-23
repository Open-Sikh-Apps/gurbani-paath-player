import type { ImageProps as ExpoImageProps } from "expo-image";
import { Image as RNImage } from "expo-image";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";

import { useTwCssElement } from "@/tw/css-element";

type ImageProps = ExpoImageProps & { className?: string };

export function Image(props: ImageProps): ReactElement {
  const flattened = StyleSheet.flatten(props.style);
  const {
    objectFit,
    objectPosition,
    ...style
  } = (flattened ?? {}) as Record<string, unknown>;

  return useTwCssElement(
    RNImage,
    {
      ...props,
      contentFit:
        (objectFit as ExpoImageProps["contentFit"] | undefined) ??
        props.contentFit,
      contentPosition:
        (objectPosition as ExpoImageProps["contentPosition"] | undefined) ??
        props.contentPosition,
      style,
    },
    { className: "style" },
  );
}

Image.displayName = "CSS(Image)";
