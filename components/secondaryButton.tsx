import { useFont } from '@/lib/FontContext';
import { getImageSource } from '@/lib/imageHelper';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

interface SecondaryButtonProps {
    onPress?: () => void;
    image?: string;
    title?: string;
}

export default function SecondaryButton({ onPress, image, title }: SecondaryButtonProps) {

    const { colors, theme } = useTheme();
    const { fontSizes } = useFont();

    return (
        <View>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.input, borderColor: colors.border }]} onPress={onPress}>
                <View style={styles.content}>
                    {image &&
                        <Image
                            style={styles.image}
                            source={getImageSource(image, theme)}
                        ></Image>
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
