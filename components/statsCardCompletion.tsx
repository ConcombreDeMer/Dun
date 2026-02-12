import { useFont } from "@/lib/FontContext";
import { useTheme } from "@/lib/ThemeContext";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text } from "react-native";

interface StatsCardProps {
    image: any;
    title: string;
    value: string;
}

export default function StatsCardCompletion({ image, title, value }: StatsCardProps) {

    const { colors } = useTheme();
    const { fontSizes } = useFont();

    const analyzeCompletionColor = () => {
        const compValue = parseInt(value.toString());
        switch (true) {
            case compValue < 30:
                return '#FF1744'; // Rouge foncé (très mauvais)
            case compValue >= 30 && compValue < 50:
                return '#FF4C4C'; // Rouge (mauvais)
            case compValue >= 50 && compValue < 70:
                return '#ffcd6fff'; // Orange (à améliorer)
            case compValue >= 70 && compValue < 85:
                return '#FFD700'; // Jaune/Or (bon)
            case compValue >= 85:
                return '#74ca77ff'; // Vert (excellent)
        }
    }

    const handleCompletionPress = () => {
        router.push('/stats/completionExplain');
    }

    return (
        <Pressable style={[styles.container, { borderColor: analyzeCompletionColor(), backgroundColor: colors.card }]}
            onPress={handleCompletionPress}
        >
            <Image source={image} style={styles.image} />
            <Text style={[styles.title, { color: colors.text, opacity: 0.7, fontSize: fontSizes.lg }]}>{title}</Text>
            <Text style={[styles.value, { color: colors.text, fontSize: fontSizes['3xl'] }]}>{value}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        width: '47.5%',
        height: '100%',
        borderRadius: 30,
        borderWidth: 0.5,
        padding: 15,
        gap: 8,
    },
    image: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    title: {
        fontWeight: '500',
        position: 'absolute',
        bottom: 10,
        left: 15,
        fontFamily: 'Satoshi-Medium',

    },
    value: {
        fontWeight: '700',
        position: 'absolute',
        top: 10,
        right: 15,
        fontFamily: 'Satoshi-Bold',
    },
});