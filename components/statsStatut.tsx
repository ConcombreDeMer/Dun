import { Image, StyleSheet, Text, View } from "react-native";


interface StatsStatutProps {
    value: string;
}

export default function StatsStatut({ value }: StatsStatutProps) {



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
            style={styles.container}
        >

            <Image source={require('../assets/images/stats/status/plant.png')} style={styles.image} />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{value}</Text>
                <Text style={styles.description}>{getDescription()}</Text>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: '#F1F1F1',
        width: '70%',
        height: '100%',
        borderRadius: 30,
        borderColor: 'rgba(0, 0, 15, 0.2)',
        borderWidth: 0.5,
        paddingRight: 15,
    },
    image: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
    },
    textContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        width: '50%',
        justifyContent: 'center',
        alignItems: 'flex-start',
        textAlign: 'left',
    },
    title: {
        fontSize: 22,
        fontWeight: '500',
        color: '#000',
    },
    description: {
        fontSize: 12,
        color: '#666',
        fontWeight: '300',
    },
});