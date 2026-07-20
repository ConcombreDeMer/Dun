import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Squircle from "../Squircle";

type OnboardingButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "success";
  disabled?: boolean;
  style?: ViewStyle;
};

export default function OnboardingButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}: OnboardingButtonProps) {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[styles.root, animatedStyle, style]}>
      <Squircle
        style={[
          styles.shell,
          variant === "success" ? styles.success : styles.primary,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={handlePress}
          onPressIn={() => {
            pressScale.value = withTiming(0.96, {
              duration: 100,
              easing: Easing.out(Easing.cubic),
            });
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, {
              damping: 16,
              mass: 0.7,
              stiffness: 230,
            });
          }}
          style={styles.pressable}
        >
          <Text style={styles.text}>{title}</Text>
        </Pressable>
      </Squircle>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  shell: {
    borderRadius: 12,
    minHeight: 46,
    overflow: "hidden",
  },
  pressable: {
    alignItems: "center",
    minHeight: 46,
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#050505",
  },
  success: {
    backgroundColor: "#85C493",
  },
  text: {
    color: "#FFFFFF",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 13,
  },
});
