import React, { useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedCheckbox({
  checked,
  onChange,
  disabled = false,
  size = 64,
}: AnimatedCheckboxProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(checked ? 1 : 0, { duration: 300 });
    rotation.value = withSpring(checked ? 360 : 0, {
      damping: 8,
      mass: 1,
      stiffness: 100,
    });
  }, [checked]);

  const animatedBoxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: scale.value,
      },
    ],
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        rotate: `${rotation.value}deg`,
      },
    ],
  }));

  const handlePress = () => {
    if (!disabled) {
      scale.value = withSpring(0.9, {
        damping: 10,
        mass: 0.8,
        stiffness: 150,
      });
      
      setTimeout(() => {
        scale.value = withSpring(1, {
          damping: 8,
          mass: 1,
          stiffness: 100,
        });
      }, 100);

      onChange(!checked);
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        animatedBoxStyle,
        {
          width: size,
          height: size,
          borderRadius: 30,
          backgroundColor: checked ? "#000001" : colors.checkbox,
          borderColor: checked ? colors.donePrimary : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {checked && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={animatedCheckStyle}
        >
          <MaterialIcons
            name="check"
            size={size * 0.6}
            color={colors.checkMark}
          />
        </Animated.View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
});
