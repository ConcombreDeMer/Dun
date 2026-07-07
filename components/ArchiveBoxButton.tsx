import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAppTranslation } from '../lib/i18n';
import { useTheme } from '../lib/ThemeContext';

type ArchiveBoxButtonProps = {
  onPress: () => void;
  offsetY?: number;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SIZE = 28;

export default function ArchiveBoxButton({ onPress, offsetY = 0, style }: ArchiveBoxButtonProps) {
  const { colors } = useTheme();
  const { t } = useAppTranslation();
  const pressProgress = useSharedValue(0);
  const [isPressed, setIsPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressProgress.value, [0, 1], [1, 0.72]),
    transform: [
      { translateY: offsetY },
      {
        scale: interpolate(pressProgress.value, [0, 1], [1, 0.9]),
      },
    ],
  }));

  const handlePressIn = () => {
    setIsPressed(true);
    pressProgress.value = withTiming(1, {
      duration: 110,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    pressProgress.value = withSpring(0, {
      damping: 15,
      mass: 0.75,
      stiffness: 240,
    });
  };

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityLabel={t('box.title')}
      hitSlop={10}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, style, animatedStyle]}
    >
      <SymbolView
        name={isPressed ? 'archivebox.fill' : 'archivebox'}
        size={SIZE}
        style={styles.icon}
        tintColor={colors.textSecondary}
        type="monochrome"
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: SIZE,
    justifyContent: 'center',
    width: SIZE,
  },
  icon: {
    height: SIZE,
    transform: [{ translateY: 2 }],
    width: SIZE,
  },
});
