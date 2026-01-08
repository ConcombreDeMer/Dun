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

    const analyzeChargeColor = () => {
        const charge = Number(value);
        switch (true) {
            case charge < 2:
                return '#FF4C4C'; // Rouge
            case charge >= 2 && charge <= 4:
                return '#ffcd6fff'; // Orange
            case charge > 4 && charge <= 7:
                return '#74ca77ff'; // Jaune
        }
    }

    const handleExplicationPress = () => {
        // Logique pour afficher une explication ou une info-bulle
        router.push('/stats/chargeExplain');
    }




    return (
        <View
            style={[styles.container, { borderColor: analyzeChargeColor() }]}
            onTouchEnd={handleExplicationPress}>
            <Image source={image} style={styles.image} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: '#F1F1F1',
        width: '47.5%',
        height: '100%',
        borderRadius: 30,
        borderColor: 'rgba(0, 0, 15, 0.2)',
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
        fontSize: 16,
        color: '#000000af',
        fontWeight: '500',
        position: 'absolute',
        bottom: 10,
        left: 15,
    },
    value: {
        fontSize: 22,
        fontWeight: '500',
        color: '#000',
        position: 'absolute',
        top: 10,
        right: 15,
    },
});