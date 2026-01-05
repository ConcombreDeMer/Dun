import { Image, StyleSheet, Text, View } from "react-native";

export default function StatsStatut() {
    return (
        <View
            style={styles.container}
        >

            <Image source={require('../assets/images/stats/status/plant.png')} style={styles.image} />
            <View style={styles.textContainer}>
                <Text style={styles.title}>Potentiel</Text>
                <Text style={styles.description}>Avec quelques
                    corrections t’auras tout
                    bon !</Text>
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