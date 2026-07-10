import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useFont } from "../lib/FontContext";
import Squircle from "./Squircle";

type PremiumCTAButtonProps = {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

const GOLD_DARK = "#DFA900";
const GOLD = "#F4BA00";
const GOLD_LIGHT = "#FFD766";
const GOLD_TEXT = "#2C2405";

export default function PremiumCTAButton({ title, onPress, style }: PremiumCTAButtonProps) {
  const { fontSizes } = useFont();
  const pressScale = useSharedValue(1);
  const shimmerProgress = useSharedValue(-1);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
        }),
        withDelay(2600, withTiming(-1, { duration: 1 }))
      ),
      -1,
      false
    );
  }, [shimmerProgress]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -130 + shimmerProgress.value * 300 },
      { rotate: "18deg" },
    ],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.97, {
      duration: 100,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, {
      damping: 16,
      mass: 0.7,
      stiffness: 230,
    });
  };

  return (
    <Animated.View style={[styles.root, style, buttonAnimatedStyle]}>
      <Squircle style={styles.shell} cornerSmoothing={100} preserveSmoothing>
        <LinearGradient
          colors={[GOLD_DARK, GOLD, GOLD_LIGHT, GOLD]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerAnimatedStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
          <View style={styles.content}>
            <SymbolView name="sparkles" size={17} tintColor={GOLD_TEXT} />
            <Text style={[styles.text, { fontSize: fontSizes.base }]}>{title}</Text>
          </View>
        </Pressable>
      </Squircle>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 6,
  },
  shell: {
    borderColor: "rgba(255, 236, 158, 0.78)",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    overflow: "hidden",
  },
  shimmer: {
    bottom: -16,
    position: "absolute",
    top: -16,
    width: 72,
  },
  pressable: {
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  text: {
    color: GOLD_TEXT,
    fontFamily: "Satoshi-Bold",
  },
});
