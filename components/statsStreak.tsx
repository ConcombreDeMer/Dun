import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";


export default function StatsStatut({ daysData }: { daysData?: any[] }) {

    const router = useRouter();


    const caluclateStreak = () => {
        const today = new Date();
        let streak = 0;


        // commencer par hier
        let currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        console.log('Calculating streak starting from', currentDate.toDateString());

        for (let day of daysData || []) {
            const dayDate = new Date(day.date);
            if(dayDate.toDateString() === today.toDateString()) {
                continue; // sauter aujourd'hui
            }
            else if (dayDate.toDateString() === currentDate.toDateString()) {

                if(day.total > 1 && day.done_count == day.total) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1); // passer au jour précédent
                }
            } else {
                break; // la chaîne est rompue
            }
        }

        if (streak === 0) return 0;
        return streak; // ne pas compter aujourd'hui
    }


    const handleExplicationPress = () => {
        // Logique pour afficher une explication ou une info-bulle
        router.push('/stats/streakExplain');
    }


    return (
        <View
            style={styles.container}
            onTouchEnd={handleExplicationPress}
        >
            <Image source={require('../assets/images/stats/streak/high.png')} style={styles.image} />
            <Text style={styles.value}>{caluclateStreak()}</Text>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F1F1F1',
        width: '25%',
        height: '100%',
        borderRadius: 30,
        borderColor: 'rgba(0, 0, 15, 0.2)',
        borderWidth: 0.5,
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },

    image: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },

    value: {
        fontSize: 22,
        fontWeight: '500',
        color: '#000',
    },
});