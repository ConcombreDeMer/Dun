import { useFont } from "@/lib/FontContext";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface StatsCardProps {
    image: any;
    title: string;
    value?: string;
}

export default function StatsCardCharge({ image, title, value }: StatsCardProps) {

    const router = useRouter();
    const { colors } = useTheme();
    const { fontSizes } = useFont();

    const analyzeChargeColor = () => {
        const charge = Number(value);
        switch (true) {
            case charge < 2:
                return '#FF1744'; // Rouge foncé (trop faible)
            case charge >= 2 && charge < 3:
                return '#FF4C4C'; // Rouge (faible)
            case charge >= 3 && charge < 5:
                return '#ffcd6fff'; // Orange (acceptable)
            case charge >= 5 && charge <= 7:
                return '#74ca77ff'; // Vert (idéal)
            case charge > 7:
                return '#FF6B35'; // Orange-rouge (avertissement surcharge)
        }
    }

    const handleExplicationPress = () => {
        // Logique pour afficher une explication ou une info-bulle
        router.push('/stats/chargeExplain');
    }




    return (
        <View
            style={[styles.container, { borderColor: analyzeChargeColor(), backgroundColor: colors.card }]}
            onTouchEnd={handleExplicationPress}>
            <Image source={image} style={styles.image} />
            <Text style={[styles.title, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>{title}</Text>
            <Text style={[styles.value, { color: colors.text, fontSize: fontSizes['2xl'] }]}>{value}</Text>
        </View>
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
    },
    value: {
        fontWeight: '500',
        position: 'absolute',
        top: 10,
        right: 15,
    },
});