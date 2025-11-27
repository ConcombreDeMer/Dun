import { Text, View, StyleSheet } from "react-native";
import { useTheme } from "../lib/ThemeContext";

interface HeadlineProps {
    title: string;
    subtitle: string;
}

export default function Headline({ title, subtitle }: HeadlineProps) {
    const { colors } = useTheme();

    return (
        <View style={{ marginBottom: 0 }}>
            <Text style={[styles.title, { color: colors.text }]}>
                {title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
                {subtitle}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 44,
        fontFamily: 'Satoshi-Bold',
    },

    subtitle: {
        fontSize: 20,
        marginLeft: 5,
        marginTop: -10,
        fontFamily: 'Satoshi-Regular',
        opacity: 0.7,
    },
});
