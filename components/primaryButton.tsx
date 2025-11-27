import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getImageSource } from "../lib/imageHelper";
import { useTheme } from "../lib/ThemeContext";



interface PrimaryButtonProps {
    title?: string;
    onPress: () => void;
    disabled?: boolean;
    image?: string;
    size?: 'large' | 'small' | 'mid';
    style?: ViewStyle;
    type?: 'danger' | 'reverse'
}

export default function PrimaryButton({ title, onPress, disabled = false, image = '', size = 'large', style, type }: PrimaryButtonProps) {
    const { colors, theme } = useTheme();

    return (
        <Pressable
            style={[
                styles.button,
                size === 'small' && styles.buttonSmall,
                size === 'mid' && styles.buttonMid,
                type === 'danger' && styles.buttonDanger,
                type === 'reverse' && styles.buttonReverse,
                disabled && styles.disabled,
                style
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            {image &&
                <Image
                    style={{ width: 29, aspectRatio: 1 }}
                    source={getImageSource(image, theme)}
                ></Image>
            }
            {(size === 'large' || size === 'mid') && <Text style={[styles.text, type === 'danger' && styles.textDanger, type === 'reverse' && styles.textReverse]}>{title}</Text>}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#000000ff',
        width: '100%',
        height: 64,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 12,
    },
    buttonSmall: {
        width: 64,
        height: 64,
        borderRadius: 30,
        aspectRatio: 1,
    },
    buttonMid: {
        width: '80%',
    },
    buttonDanger: {
        backgroundColor: '#F7C1C1',
    },
    buttonReverse: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#000000ff',
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        color: '#FFF',
        fontSize: 24,
        fontFamily: 'Satoshi-Regular',
    },
    textDanger: {
        color: '#A10606',
    },
    textReverse: {
        color: '#000000ff',
    },
});
