import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

type OnboardingLogoutMenuProps = {
  label: string;
  onLogoutPress: () => void;
};

export default function OnboardingLogoutMenu({
  label,
  onLogoutPress,
}: OnboardingLogoutMenuProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onLogoutPress}
      style={styles.trigger}
    >
      <SymbolView
        name="ellipsis"
        size={24}
        tintColor="#151515"
        weight="bold"
        style={styles.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  icon: {
    transform: [{ rotate: "90deg" }],
  },
});
