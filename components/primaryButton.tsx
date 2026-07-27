import { SquircleView } from 'expo-squircle-view';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { Pressable, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useFont } from "../lib/FontContext";
import { useTheme } from "../lib/ThemeContext";


interface PrimaryButtonProps {
    title?: string;
    onPress: () => void;
    disabled?: boolean;
    image?: SFSymbol | '';
    size?: 'L' | 'M' | 'S' | 'XS';
    style?: ViewStyle;
    type?: 'danger' | 'reverse'
    width?: number;
    height?: number;
}

const AnimatedSquircleView = Animated.createAnimatedComponent(SquircleView);

export default function PrimaryButton({ title, onPress, disabled = false, image = '', size = 'L', style, type, width, height }: PrimaryButtonProps) {
    const { colors, actualTheme } = useTheme();
    const { fontSizes } = useFont();
    const scale = useSharedValue(1);
    const pressOpacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: disabled ? 0.5 : pressOpacity.value,
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        if (disabled) return;
        scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
        pressOpacity.value = withTiming(0.86, { duration: 90 });
    };

    const handlePressOut = () => {
        if (disabled) return;
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        pressOpacity.value = withTiming(1, { duration: 120 });
    };

    const getContentColor = () => {
        if (type === 'danger') {
            return '#A10606';
        }

        if (type === 'reverse') {
            return actualTheme === 'dark' ? colors.textSecondary : colors.actionButton;
        }

        return colors.buttonText;
    };

    const getButtonStyle = () => {
        let baseStyle: any = {
            backgroundColor: colors.actionButton,
            width: '100%',
            height: height || 64,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 12,
            overflow: 'hidden',
        };

        if (size === 'S') baseStyle.width = '50%';
        if (size === 'M') baseStyle.width = '80%';
        if (size === 'XS') {
            baseStyle = { ...baseStyle, width: 64, aspectRatio: 1 };
        }

        if (type === 'danger') {
            baseStyle.backgroundColor = '#F7C1C1';
        } else if (type === 'reverse') {
            baseStyle.backgroundColor = actualTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : colors.background;
            baseStyle.borderWidth = 1;
            baseStyle.borderColor = colors.actionButton;
        }

        // Appliquer le height personnalisé en dernier pour qu'il soit prioritaire
        if (width) {
            baseStyle.width = width;
        }

        return baseStyle;
    };

    const getTextStyle = () => {
        let baseTextStyle: any = {
            color: getContentColor(),
            fontSize: fontSizes['3xl'],
            fontFamily: 'Satoshi-Medium',
        };

        return baseTextStyle;
    };

    return (
        <AnimatedSquircleView
            style={[getButtonStyle(), style, animatedStyle]}
            // onPress={onPress}
            // disabled={disabled}
            cornerSmoothing={100}
            preserveSmoothing={true}
        >
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            >

            </Pressable>

            {/* {
                type !== 'danger' && type !== 'reverse' &&  (

                    <LinearGradient
                        colors={['#484848', '#171717']}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 0,
                        }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                )
            } */}




            {image &&
                <SymbolView
                    name={image}
                    style={{ width: 24, height: 24, alignSelf: 'center' }}
                    type="monochrome"
                    tintColor={getContentColor()}
                />
            }
            {(size === 'L' || size === 'M' || size === 'S') && title && <Text style={getTextStyle()}>{title}</Text>}
        </AnimatedSquircleView>
    );
}
