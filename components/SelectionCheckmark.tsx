import { useTheme } from "@/lib/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

export default function SelectionCheckmark() {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.text }]}>
            <Text style={[styles.icon, { color: colors.background }]}>✓</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    icon: {
        fontWeight: "bold",
        fontSize: 13,
    },
});
