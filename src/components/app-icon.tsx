import MaterialIcons from "@react-native-vector-icons/material-icons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

export type AppIconName = ComponentProps<typeof MaterialIcons>["name"];

type AppIconProps = {
  name: AppIconName;
  size: number;
  color: ColorValue;
};

export function AppIcon({ name, size, color }: AppIconProps) {
  return <MaterialIcons name={name} size={size} color={color} />;
}
