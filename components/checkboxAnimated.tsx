import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
  const opacity = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(checked ? 1 : 0, { duration: 200 });
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
  }));

  const handlePress = () => {
    if (!disabled) {
      scale.value = withSpring(0.9, {
        damping: 10,
        mass: 0.8,
        stiffness: 150,
      });
      
      const timeout = setTimeout(() => {
        scale.value = withSpring(1, {
          damping: 8,
          mass: 1,
          stiffness: 100,
        });
      }, 100);

      onChange(!checked);
      
      return () => clearTimeout(timeout);
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
          borderRadius: 100,
          backgroundColor: checked ? "#000001" : colors.checkbox,
          borderColor: checked ? "#000001" : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {checked && (
        <Animated.View style={animatedCheckStyle}>
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
