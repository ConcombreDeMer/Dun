import { SquircleView } from 'expo-squircle-view';
import { ReactNode, useEffect } from 'react';
import { DimensionValue, GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type AnimatedDimension = number | `${number}%`;

type ExtendedButtonProps = {
    children?: ReactNode;
    onPress: () => void;
    disabled?: boolean;
    pressDisabled?: boolean;
    onPressIn?: (event: GestureResponderEvent) => void;
    onPressOut?: (event: GestureResponderEvent) => void;
    width?: AnimatedDimension;
    height?: AnimatedDimension;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ExtendedButton({
    children,
    onPress,
    disabled = false,
    pressDisabled = false,
    onPressIn,
    onPressOut,
    width = '80%',
    height = 64,
    borderRadius = 17,
    style,
    contentStyle,
}: ExtendedButtonProps) {
    const animatedWidth = useSharedValue<AnimatedDimension>(width);
    const animatedHeight = useSharedValue<AnimatedDimension>(height);

    useEffect(() => {
        animatedWidth.value = withSpring(width);
        animatedHeight.value = withSpring(height);
    }, [animatedHeight, animatedWidth, height, width]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: animatedWidth.value as DimensionValue,
        height: animatedHeight.value as DimensionValue,
    }));

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={disabled || pressDisabled}
            style={[styles.button, animatedStyle, disabled && styles.disabled, style]}
        >
            <SquircleView
                style={[styles.squircle, { borderRadius }]}
                cornerSmoothing={100}
                enabledIOSAnimation
                preserveSmoothing
            >
                {/* <LinearGradient
                    colors={['#484848', '#171717']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                /> */}
                <View style={[styles.content, contentStyle]}>{children}</View>
            </SquircleView>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    button: {
        overflow: 'hidden',
    },
    squircle: {
        flex: 1,
        borderRadius: 17,
        overflow: 'hidden',
        backgroundColor: '#353535',
    },
    disabled: {
        opacity: 0.5,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
