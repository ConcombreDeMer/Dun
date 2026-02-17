import { useFont } from "@/lib/FontContext";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInLeft, FadeOut } from "react-native-reanimated";

interface StatsCardProps {
    image: any;
    title: string;
    value?: string;
    loading?: boolean;
}

export default function StatsCardCharge({ image, title, value, loading }: StatsCardProps) {

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

            {
                loading && (<Animated.Text
                    exiting={FadeOut.springify()}
                    style={[styles.value, { color: colors.text, fontSize: fontSizes['3xl'] }]}></Animated.Text>)
            }

            {
                !loading && value && (<Animated.Text
                    entering={FadeInLeft.springify()}
                    style={[styles.value, { color: colors.text, fontSize: fontSizes['3xl'] }]}>{value}</Animated.Text>)
            }

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        width: '48.5%',
        height: '100%',
        borderRadius: 15,
        borderWidth: 0.5,
        padding: 15,
        gap: 8,
        boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.1)',
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