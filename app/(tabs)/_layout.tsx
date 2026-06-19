import { CreateModalControllerProvider, useCreateModalController } from "@/lib/createModalController";
import { useTheme } from "@/lib/ThemeContext";
import * as Haptics from "expo-haptics";
import { NativeTabs } from "expo-router/unstable-native-tabs";

function Tabs() {
  const { openCreateModal } = useCreateModalController();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const tabTintColor = isDark ? "#FFFFFF" : "#000000";
  const tabIconColor = isDark ? "rgba(255, 255, 255, 0.58)" : "rgba(0, 0, 0, 0.52)";
  const tabBackgroundColor = isDark ? "rgba(18, 18, 18, 0.92)" : "rgba(255, 255, 255, 0.86)";

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openCreateModal();
  }

  return (
    <NativeTabs
      tintColor={tabTintColor}
      iconColor={{ default: tabIconColor, selected: tabTintColor }}
      backgroundColor={tabBackgroundColor}
      blurEffect={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
      shadowColor={isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"}
      rippleColor={isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.10)"}
      indicatorColor={isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.10)"}
      disableTransparentOnScrollEdge
      unstable_nativeProps={{
        onTabSelectionPrevented: () => {
          handlePress();
        },
      }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" selectedColor={tabTintColor} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label hidden>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="home" selectedColor={tabTintColor} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label hidden>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="home" selectedColor={tabTintColor} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create-task" disabled role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'plus', selected: 'gearshape.fill' }} md="home" selectedColor={tabTintColor} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabsLayout() {
  return (
    <CreateModalControllerProvider>
      <Tabs />
    </CreateModalControllerProvider>
  );
}
