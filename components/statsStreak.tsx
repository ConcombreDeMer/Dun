import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";


export default function StatsStatut({ value }: { value: string }) {

    const router = useRouter();
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
            <Text style={styles.value}>{value}</Text>

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