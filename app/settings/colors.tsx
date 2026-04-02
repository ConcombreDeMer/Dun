import Headline from "@/components/headline";
import SecondaryButton from "@/components/secondaryButton";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFont } from "../../lib/FontContext";
import { colorThemeOptions, darkColors, lightColors, useTheme } from "../../lib/ThemeContext";

export default function ColorSettings() {
    const router = useRouter();
    const { colorTheme, actualTheme, colors, setColorTheme } = useTheme();
    const { fontSizes } = useFont();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <SecondaryButton
                    onPress={() => router.back()}
                    image="chevron.left"
                />
                <Headline title="Couleur" subtitle="Choisir un coloris global" />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {colorThemeOptions.map((option) => {
                    const isActive = colorTheme === option.id;
                    const previewColors = actualTheme === "light"
                        ? { ...lightColors, ...option.light }
                        : { ...darkColors, ...option.dark };

                    return (
                        <SquircleButton
                            key={option.id}
                            style={[
                                styles.optionCard,
                                {
                                    backgroundColor: previewColors.card,
                                    borderColor: isActive ? colors.text : colors.border,
                                    borderWidth: isActive ? 2 : 1,
                                },
                            ]}
                            onPress={() => setColorTheme(option.id)}
                        >
                            <View
                                style={[
                                    styles.preview,
                                    { backgroundColor: previewColors.background },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.previewCard,
                                        { backgroundColor: previewColors.task },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.previewLineLg,
                                            { backgroundColor: previewColors.text },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.previewLineSm,
                                            { backgroundColor: previewColors.textSecondary },
                                        ]}
                                    />
                                    <View style={styles.previewFooter}>
                                        <View
                                            style={[
                                                styles.previewChip,
                                                { backgroundColor: previewColors.button },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.previewDot,
                                                { backgroundColor: previewColors.checkbox },
                                            ]}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.optionBottom}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.optionTitle, { color: previewColors.text, fontSize: fontSizes.lg }]}>
                                        {option.label}
                                    </Text>
                                    <Text style={[styles.optionDescription, { color: previewColors.textSecondary, fontSize: fontSizes.sm }]}>
                                        {option.description}
                                    </Text>
                                </View>

                                {isActive && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkIcon}>✓</Text>
                                    </View>
                                )}
                            </View>
                        </SquircleButton>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
    },

    header: {
        marginBottom: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },

    content: {
        gap: 14,
        paddingBottom: 120,
    },

    optionCard: {
        borderRadius: 15,
        padding: 14,
    },

    preview: {
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
    },

    previewCard: {
        borderRadius: 12,
        padding: 14,
    },

    previewLineLg: {
        height: 8,
        width: "56%",
        borderRadius: 999,
        opacity: 0.85,
        marginBottom: 8,
    },

    previewLineSm: {
        height: 6,
        width: "38%",
        borderRadius: 999,
        opacity: 0.35,
    },

    previewFooter: {
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    previewChip: {
        width: 70,
        height: 26,
        borderRadius: 999,
    },

    previewDot: {
        width: 18,
        height: 18,
        borderRadius: 999,
    },

    optionBottom: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    optionTitle: {
        fontFamily: "Satoshi-Bold",
        marginBottom: 4,
    },

    optionDescription: {
        fontFamily: "Satoshi-Regular",
    },

    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },

    checkmarkIcon: {
        color: "#fff",
        fontWeight: "bold",
    },
});
