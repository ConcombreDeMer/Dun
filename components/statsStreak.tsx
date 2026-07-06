import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { Image, StyleSheet, Text } from "react-native";


export default function StatsStatut({ value }: { value: string }) {

    const router = useRouter();
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();
    const handleExplicationPress = () => {
        // Logique pour afficher une explication ou une info-bulle
        router.push('/stats/streakExplain');
    }


    return (
        <SquircleButton
            activeOpacity={0.82}
            cornerSmoothing={100}
            preserveSmoothing
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleExplicationPress}
        >
            <Image source={require('../assets/images/stats/streak/high.png')} style={styles.image} />
            <Text style={[{ color: colors.text, fontSize: fontSizes.lg, fontFamily: 'Satoshi-Medium' }]}>
                <Text>{t("stats.badge.days", { count: Number(value) })}</Text>
                <Text style={{ opacity: 0.6 }}>{t("stats.badge.suffix")}</Text>
            </Text>

        </SquircleButton>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 76,
        borderRadius: 20,
        borderWidth: 0.5,
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 10,
        paddingRight: 15,
        width: "90%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.1)',
    },

    image: {
        width: 38,
        height: 38,
        resizeMode: 'contain',
    },

});
