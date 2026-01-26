import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { getImageSource } from "../lib/imageHelper";
import { useTheme } from "../lib/ThemeContext";



interface PrimaryButtonProps {
    title?: string;
    onPress: () => void;
    disabled?: boolean;
    image?: string;
    size?: 'L' | 'M' | 'S' | 'XS';
    style?: ViewStyle;
    type?: 'danger' | 'reverse'
}

export default function PrimaryButton({ title, onPress, disabled = false, image = '', size = 'L', style, type }: PrimaryButtonProps) {
    const { colors, theme } = useTheme();

    const getButtonStyle = () => {
        let baseStyle: any = {
            backgroundColor: colors.actionButton,
            width: '100%',
            height: 64,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 12,
        };

        if (size === 'S') baseStyle.width = '50%';
        if (size === 'M') baseStyle.width = '80%';
        if (size === 'XS') {
            baseStyle = { ...baseStyle, width: 64, height: 64, aspectRatio: 1 };
        }

        if (type === 'danger') {
            baseStyle.backgroundColor = '#F7C1C1';
        } else if (type === 'reverse') {
            baseStyle.backgroundColor = colors.background;
            baseStyle.borderWidth = 1;
            baseStyle.borderColor = colors.actionButton;
        }

        if (disabled) {
            baseStyle.opacity = 0.5;
        }

        return baseStyle;
    };

    const getTextStyle = () => {
        let baseTextStyle: any = {
            color: colors.buttonText,
            fontSize: 24,
            fontFamily: 'Satoshi-Regular',
        };

        if (type === 'danger') {
            baseTextStyle.color = '#A10606';
        } else if (type === 'reverse') {
            baseTextStyle.color = colors.actionButton;
        }

        return baseTextStyle;
    };

    return (
        <TouchableOpacity
            style={[getButtonStyle(), style]}
            onPress={onPress}
            disabled={disabled}
        >
            {image &&
                <Image
                    style={{ width: 29, aspectRatio: 1 }}
                    source={getImageSource(image, theme)}
                ></Image>
            }
            {(size === 'L' || size === 'M' || size === 'S') && <Text style={getTextStyle()}>{title}</Text>}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({});
