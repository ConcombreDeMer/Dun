import { useFont } from "@/lib/FontContext";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";


export default function StatsStatut({ value }: { value: string }) {

    const router = useRouter();
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const handleExplicationPress = () => {
        // Logique pour afficher une explication ou une info-bulle
        router.push('/stats/streakExplain');
    }


    return (
        <View
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
            onTouchEnd={handleExplicationPress}
        >
            <Image source={require('../assets/images/stats/streak/high.png')} style={styles.image} />
            <Text style={[styles.value, { color: colors.text, fontSize: fontSizes.lg, fontFamily: 'Satoshi-Medium' }]}>
                <Text>{value} jours</Text>
                <Text style={{opacity: 0.6}}> de streak</Text>
            </Text>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 48,
        borderRadius: 30,
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
        fontWeight: '300',
    },
});