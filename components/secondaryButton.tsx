import { useFont } from '@/lib/FontContext';
import { SFSymbol, SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

interface SecondaryButtonProps {
    onPress?: () => void;
    image?: SFSymbol;
    title?: string;
    type?: 'default' | 'danger';
}

export default function SecondaryButton({ onPress, image, title, type = 'default' }: SecondaryButtonProps) {

    const { colors, theme } = useTheme();
    const { fontSizes } = useFont();

    const getButtonStyle = () => {
        let baseStyle: any = {
            backgroundColor: colors.input,
            borderColor: colors.border,
        };

        if (type === 'danger') {
            baseStyle.backgroundColor = '#F7C1C1';
            baseStyle.borderColor = '#F7C1C1';
        }

        return baseStyle;
    };

    const getIconColor = () => {
        if (type === 'danger') {
            return '#A10606';
        }
        return colors.text;
    };

    const getTitleColor = () => {
        if (type === 'danger') {
            return '#A10606';
        }
        return colors.text;
    };

    return (
        <View>
            <TouchableOpacity style={[styles.button, getButtonStyle()]} onPress={onPress}>
                <View style={styles.content}>
                    {image &&
                        <SymbolView
                            name={image}
                            style={{ width: 24, height: 24, opacity: 0.3 }}
                            type="palette"
                            tintColor={getIconColor()}
                        />
                    }
                </View>
            </TouchableOpacity>
            {title && <Text style={[styles.title, { color: getTitleColor(), fontSize: fontSizes.sm }]}>{title}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 48,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 0.5,
    },
    content: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: 42,
        height: 42,
        aspectRatio: 1,
    },
    title: {
        marginTop: 4,
        fontWeight: '500',
    },
});
