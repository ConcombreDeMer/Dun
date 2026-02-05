import { useFont } from "@/lib/FontContext";
import { useTheme } from "@/lib/ThemeContext";
import { Image, StyleSheet, Text, View } from "react-native";

interface StatsStatutProps {
    value: string;
}

export default function StatsStatut({ value }: StatsStatutProps) {

    const { colors } = useTheme();
    const { fontSizes } = useFont();

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

    const getDescription = () => {
        switch (value) {
            case 'Fantôme':
                return "Commence à créer des tâches et établis une routine !";
            case 'Robot':
                return "Bah c'est juste flippant là !";
            case 'Acharné':
                return "Tu travailles dur rien ne t'arrêtes ! Attention au surmenage tout de même.";
            case 'Ambitieux':
                return "Tu veux bien faire, prends ton temps pour y arriver !";
            case 'Procrastinateur':
                return "C'est le moment de passer à l'action !";
            case 'Productif':
                return "Excellent ! T'es au sweet spot !";
            case 'En devenir':
                return "Continue tu fais ça bien ! Maintiens le cap !";
            case 'Équilibré':
                return "Bien équilibré entre charge et complétion !";
            case 'En progression':
                return "Tu avances dans la bonne direction !";
            case 'Potentiel':
                return "T'en as dans le ventre !";
            case 'En construction':
                return "Tu poses les bases, c'est un bon départ !";
            case 'Hésitant':
                return "Ne t'arrete pas dans ta montée !";
            case 'Flâneur':
                return "Relève-toi et engage-toi davantage !";
            default:
                return "Avec quelques corrections t'auras tout bon !";
        }
    }

    return (
        <View
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        >

            <Image source={getImageSource()} style={styles.image} />
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.text, fontSize: fontSizes['3xl'] }]}>{value}</Text>
                {/* <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>{getDescription()}</Text> */}
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