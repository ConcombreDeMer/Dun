import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text } from "react-native";
import Squircle from "./Squircle";


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
        <Squircle
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
            onTouchEnd={handleExplicationPress}
        >
            <Image source={require('../assets/images/stats/streak/high.png')} style={styles.image} />
            <Text style={[styles.value, { color: colors.text, fontSize: fontSizes.lg, fontFamily: 'Satoshi-Medium' }]}>
                <Text>{t("stats.badge.days", { count: Number(value) })}</Text>
                <Text style={{opacity: 0.6}}>{t("stats.badge.suffix")}</Text>
            </Text>

        </Squircle>
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
