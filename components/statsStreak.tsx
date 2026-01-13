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
            <Text style={styles.value}>
                <Text style={{fontWeight: '500'}}>{value}</Text>
                <Text> jours de streak</Text>
            </Text>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F1F1F1',
        height: 42,
        borderRadius: 30,
        borderColor: 'rgba(0, 0, 15, 0.2)',
        borderWidth: 0.5,
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 10,
        paddingRight: 15,
    },

    image: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },

    value: {
        fontSize: 16,
        fontWeight: '300',
        color: '#000',
    },
});