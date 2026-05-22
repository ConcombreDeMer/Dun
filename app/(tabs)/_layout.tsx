import { useTheme } from "@/lib/ThemeContext";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      blurEffect="systemMaterial"
      disableTransparentOnScrollEdge
      iconColor={{
        default: colors.textSecondary,
        selected: colors.text,
      }}
      labelStyle={{
        default: {
          color: colors.textSecondary,
          fontFamily: "Satoshi-Medium",
          fontSize: 11,
        },
        selected: {
          color: colors.text,
          fontFamily: "Satoshi-Bold",
          fontSize: 11,
        },
      }}
      tintColor={colors.text}
      shadowColor={colors.border}
    >
      <NativeTabs.Trigger name="home">
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={require("@/assets/images/light/home.png")}
        />
        <Label hidden />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          androidSrc={require("@/assets/images/stats/done.png")}
        />
        <Label hidden />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          androidSrc={require("@/assets/images/light/settings.png")}
        />
        <Label hidden />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
