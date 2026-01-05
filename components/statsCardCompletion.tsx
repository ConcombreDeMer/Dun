import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface StatsCardProps {
    image: any;
    title: string;
    daysData: any[];
}

export default function StatsCardCompletion({ image, title, daysData }: StatsCardProps) {

    const [completion, setCompletion] = React.useState<string>("0%");


    const calculateCompletion = () => {
        if (!daysData || daysData.length === 0) return "0%";

        // Faire une moyenne de la complétion des 7 derniers jours
        let totalCompletion = 0;
        let count = 0;

        for (let i = 0; i < Math.min(7, daysData.length); i++) {
            const day = daysData[i];
            if (day.total > 0) {
                totalCompletion += (day.done_count / day.total) * 100;
                count++;
            }
        }

        console.log('Total Completion:', totalCompletion, 'Count:', count);

        const averageCompletion = Math.round(totalCompletion / count);
        return `${averageCompletion}%`;
    }


    const analyzeCompletionColor = () => {
        const compValue = parseInt(completion);
        switch (true) {
            case compValue < 50:
                return '#FF4C4C'; // Rouge
            case compValue >= 50 && compValue <= 80:
                return '#ffcd6fff'; // Orange
            case compValue > 80:
                return '#74ca77ff'; // Vert
        }
    }

    const handleCompletionPress = () => {
        router.push('/stats/completionExplain');
    }

    React.useEffect(() => {
        const comp = calculateCompletion();
        setCompletion(comp);
    }, [daysData]);



    return (
        <View style={[styles.container, { borderColor: analyzeCompletionColor() }]}
            onTouchEnd={handleCompletionPress}
        >
            <Image source={image} style={styles.image} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.value}>{completion}</Text>
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
        color: '#666',
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