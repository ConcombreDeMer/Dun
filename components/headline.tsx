import { StyleSheet, Text, View } from "react-native";
import { useFont } from "../lib/FontContext";
import { useTheme } from "../lib/ThemeContext";

interface HeadlineProps {
    title: string;
    subtitle: string;
}

export default function Headline({ title, subtitle }: HeadlineProps) {
    const { colors } = useTheme();
    const { fontSizes } = useFont();

    return (
        <View style={{ marginBottom: 0 }}>
            <Text style={[styles.title, { color: colors.text, fontSize: fontSizes['6xl'] }]}>
                {title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text, fontSize: fontSizes['2xl'] }]}>
                {subtitle}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    title: {
        fontFamily: 'Satoshi-Bold',
    },

    subtitle: {
        marginLeft: 5,
        marginTop: -10,
        fontFamily: 'Satoshi-Regular',
        opacity: 0.7,
    },
});
