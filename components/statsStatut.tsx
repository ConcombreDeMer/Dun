import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { Image, StyleSheet, Text, View } from "react-native";

interface StatsStatutProps {
    value: string;
}

export default function StatsStatut({ value }: StatsStatutProps) {

    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();

    const getStatusKey = () => {
        switch (value) {
            case 'Fantôme':
                return 'ghost';
            case 'Robot':
                return 'robot';
            case 'Acharné':
                return 'relentless';
            case 'Ambitieux':
                return 'ambitious';
            case 'Procrastinateur':
                return 'procrastinator';
            case 'Productif':
                return 'productive';
            case 'En devenir':
                return 'becoming';
            case 'Équilibré':
                return 'balanced';
            case 'En progression':
                return 'improving';
            case 'Potentiel':
                return 'potential';
            case 'En construction':
                return 'building';
            case 'Hésitant':
                return 'hesitant';
            case 'Flâneur':
                return 'wanderer';
            default:
                return 'unknown';
        }
    };

    const statusKey = getStatusKey();

    const getImageSource = () => {
        const imageMap: { [key: string]: any } = {
            'Fantôme': require('../assets/images/stats/status/fantome.png'),
            'Robot': require('../assets/images/stats/status/robot.png'),
            'Acharné': require('../assets/images/stats/status/acharne.png'),
            'Ambitieux': require('../assets/images/stats/status/ambiteux.png'),
            'Procrastinateur': require('../assets/images/stats/status/procrastinateur.png'),
            'Productif': require('../assets/images/stats/status/productif.png'),
            'En devenir': require('../assets/images/stats/status/devenir.png'),
            'Équilibré': require('../assets/images/stats/status/equilibre.png'),
            'En progression': require('../assets/images/stats/status/progress.png'),
            'Potentiel': require('../assets/images/stats/status/potentiel.png'),
            'En construction': require('../assets/images/stats/status/construction.png'),
            'Hésitant': require('../assets/images/stats/status/hesitant.png'),
            'Flâneur': require('../assets/images/stats/status/flaneur.png'),
        };
        return imageMap[value] || require('../assets/images/stats/status/fantome.png');
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        >

            <Image source={getImageSource()} style={styles.image} />
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.text, fontSize: fontSizes['3xl'] }]}>{t(`stats.status.${statusKey}.title`)}</Text>
                {/* <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>{t(`stats.status.${statusKey}.description`)}</Text> */}
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'center',
        width: '50%',
        height: 150,
        // borderTopLeftRadius: 20,
        // borderTopRightRadius: 20,
        // borderBottomLeftRadius: 20,
        // borderBottomRightRadius: 20,
        borderRadius: 25,
        borderWidth: 0.5,
        paddingHorizontal: 20,
    },
    image: {
        height: '70%',
        resizeMode: 'contain',
    },
    textContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        height: '30%',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'left',
    },
    title: {
        fontWeight: '500',
    },
    description: {
        fontWeight: '300',
    },
});
