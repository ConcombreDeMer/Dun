import { Image, StyleSheet, Text, View } from "react-native";

export default function StatsStatut() {
    return (
        <View
            style={styles.container}
        >

            <Image source={require('../assets/images/stats/streak/high.png')} style={styles.image} />
            <Text style={styles.value}>12</Text>

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
        fontWeight: 'bold',
        color: '#000',
    },
});