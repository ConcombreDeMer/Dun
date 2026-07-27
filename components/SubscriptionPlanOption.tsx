import { Feather } from "@expo/vector-icons";
import { SquircleButton } from "expo-squircle-view";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/lib/ThemeContext";

type SubscriptionPlanOptionProps = {
  disabled?: boolean;
  discount?: string;
  label: string;
  onPress: () => void;
  price: string;
  selected: boolean;
};

export default function SubscriptionPlanOption({
  disabled = false,
  discount,
  label,
  onPress,
  price,
  selected,
}: SubscriptionPlanOptionProps) {
  return (
    <SquircleButton
      accessibilityRole="button"
      activeOpacity={disabled ? 1 : 0.86}
      cornerSmoothing={100}
      disabled={disabled}
      onPress={onPress}
      preserveSmoothing={true}
      style={[styles.planRow, disabled ? styles.planRowDisabled : null]}
    >
      <Text style={styles.planLabel}>{label}</Text>
      <View style={styles.planPriceGroup}>
        {discount ? <Text style={styles.planDiscount}>{discount}</Text> : null}
        <Text style={styles.planPrice}>{price}</Text>
      </View>
      <TaskStyleCheckbox checked={selected} />
    </SquircleButton>
  );
}

function TaskStyleCheckbox({ checked }: { checked: boolean }) {
  const { actualTheme, colors } = useTheme();
  const dotScale = useSharedValue(checked ? 1 : 0);
  const checkboxDoneBackground = actualTheme === "dark" ? "rgba(92, 255, 173, 0.13)" : "rgba(8, 225, 139, 0.13)";
  const checkboxDoneBorder = actualTheme === "dark" ? "#42E690" : "#08E18B";
  const checkboxDoneIcon = actualTheme === "dark" ? "#42E690" : "#08E18B";

  useEffect(() => {
    dotScale.value = withSpring(checked ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 0.7,
      overshootClamping: true,
    });
  }, [checked, dotScale]);

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      dotScale.value,
      [0, 1],
      [colors.checkbox, checkboxDoneBackground]
    ),
    borderColor: interpolateColor(
      dotScale.value,
      [0, 1],
      [colors.border, checkboxDoneBorder]
    ),
    transform: [{ scale: 0.96 + dotScale.value * 0.04 }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotScale.value,
    transform: [{ scale: 0.6 + dotScale.value * 0.4 }],
  }));

  return (
    <View style={styles.checkboxContainer}>
      <Animated.View style={[styles.taskCheckbox, checkboxAnimatedStyle]}>
        <Animated.View style={checkAnimatedStyle}>
          <Feather name="check" size={21} color={checkboxDoneIcon} strokeWidth={3.2} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  planRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    height: 56,
    paddingLeft: 22,
    paddingRight: 8,
  },
  planRowDisabled: {
    opacity: 0.62,
  },
  planLabel: {
    color: "#050505",
    flex: 1,
    fontFamily: "Satoshi-Regular",
    fontSize: 17,
  },
  planPriceGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginRight: 10,
  },
  planDiscount: {
    color: "#8A8A8A",
    fontFamily: "Satoshi-Regular",
    fontSize: 13,
  },
  planPrice: {
    color: "#050505",
    fontFamily: "Satoshi-Regular",
    fontSize: 17,
  },
  checkboxContainer: {
    alignItems: "center",
    flexShrink: 0,
    height: 45,
    justifyContent: "center",
    position: "relative",
    width: 45,
  },
  taskCheckbox: {
    alignItems: "center",
    borderRadius: 100,
    borderWidth: 1.5,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
});
