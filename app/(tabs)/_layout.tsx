import { CreateModalControllerProvider, useCreateModalController } from "@/lib/createModalController";
import * as Haptics from "expo-haptics";
import { NativeTabs } from "expo-router/unstable-native-tabs";

function Tabs() {
  const { openCreateModal } = useCreateModalController();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openCreateModal();
  }

  return (
    <NativeTabs
      unstable_nativeProps={{
        onTabSelectionPrevented: () => {
          handlePress();
        },
      }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" selectedColor={"black"} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label hidden>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="home" selectedColor={"black"} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label hidden>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="home" selectedColor={"black"} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create-task" disabled role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'plus', selected: 'gearshape.fill' }} md="home" selectedColor={"black"} />
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
