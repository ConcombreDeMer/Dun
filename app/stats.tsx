import { View, Text, Touchable, TouchableOpacity } from "react-native";
import { StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Stats() {
    return (
        <View style={styles.container}>
            <Text>Page stats</Text>
            <TouchableOpacity
                onPress={() => router.push("../")}
            >
                <Text>Go back</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});