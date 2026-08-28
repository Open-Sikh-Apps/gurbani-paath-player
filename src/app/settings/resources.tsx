import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { ResourcesScreen } from "@/screens/resources";
import { HeaderCloseButton } from "@/components/header-close-button";
import { OverflowMenu } from "@/components/overflow-menu";

export default function ResourcesRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t("resources.title"),
          headerLeft: () => <HeaderCloseButton />,
          headerRight: () => <OverflowMenu />, }} />
      <ResourcesScreen />
    </>
  );
}
