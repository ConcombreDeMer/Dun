import { useFont } from '@/lib/FontContext';
import { SFSymbol, SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

interface SecondaryButtonProps {
    onPress?: () => void;
    image?: SFSymbol;
    title?: string;
    backgroundColor?: string;
    imageColor?: string;
}

export default function SecondaryButton({ onPress, image, title, backgroundColor, imageColor }: SecondaryButtonProps) {

    const { colors, theme } = useTheme();
    const { fontSizes } = useFont();

    return (
        <View>
            <TouchableOpacity style={[styles.button, { backgroundColor: backgroundColor || colors.input, borderColor: colors.border }]} onPress={onPress}>
                <View style={styles.content}>
                    {image &&
                        <SymbolView
                            name={image}
                            style={{ width: 24, height: 24, opacity: 1 }}
                            type="palette"
                            tintColor={imageColor || colors.textSecondary}
                        />
                    }
                </View>
            </TouchableOpacity>
            {title && <Text style={[styles.title, { color: colors.text, fontSize: fontSizes.sm }]}>{title}</Text>}
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
