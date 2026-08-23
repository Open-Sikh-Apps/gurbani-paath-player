import { Tabs } from "expo-router";

import { AppTabBar } from "@/components/app-tab-bar";

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="none"
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(library)" />
    </Tabs>
  );
}
