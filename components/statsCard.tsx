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

    const handleExplicationPress = () => {
        // Logique pour afficher une explication ou une info-bulle
        router.push('/stats/chargeExplain');
    }




    return (
        <View
            style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
            <Image source={image} style={styles.image} />
            <Text style={[styles.title, { color: colors.text, opacity: 0.7, fontSize: fontSizes.lg }]}>{title}</Text>
            <Text style={[styles.value, { color: colors.text, fontSize: fontSizes['3xl'] }]}>{value}</Text>
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
        width: 60,
        height: 60,
        resizeMode: 'contain',
        position: 'absolute',
        top: 10,
        left: 10,
        mixBlendMode: 'darken',
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