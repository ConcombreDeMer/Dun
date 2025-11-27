import { getImageSource } from '@/lib/imageHelper';
import React from 'react';
import { TouchableOpacity, StyleSheet, Image, Text, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

interface SecondaryButtonProps {
    onPress?: () => void;
    image?: string;
    title?: string;
}

export default function SecondaryButton({ onPress, image, title }: SecondaryButtonProps) {

    const { colors, theme } = useTheme();

    return (
        <View>
            <TouchableOpacity style={styles.button} onPress={onPress}>
                <View style={styles.content}>
                    {image &&
                        <Image
                            style={styles.image}
                            source={getImageSource(image, theme)}
                        ></Image>
                    }
                </View>
            </TouchableOpacity>
            {title && <Text style={styles.title}>{title}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 48,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F1F1',
        borderRadius: 24,
        borderWidth: 0.5,
        borderColor: '#DDDDDD',
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
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
});
