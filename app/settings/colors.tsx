import Headline from "@/components/headline";
import SecondaryButton from "@/components/secondaryButton";
import SelectionCheckmark from "@/components/SelectionCheckmark";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useSubscription } from "@/lib/subscription";
import { colorThemeOptions, darkColors, lightColors, useTheme } from "@/lib/ThemeContext";

export default function ColorSettings() {
    const router = useRouter();
    const { t } = useAppTranslation();
    const { colorTheme, actualTheme, colors, setColorTheme } = useTheme();
    const { fontSizes } = useFont();
    const { canUsePremiumColorThemes } = useSubscription();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <SecondaryButton
                    onPress={() => router.back()}
                    image="chevron.left"
                />
                <Headline
                    title={t("settings.colors.headline.title")}
                    subtitle={t("settings.colors.headline.subtitle")}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {colorThemeOptions.map((option) => {
                    const isActive = colorTheme === option.id;
                    const isPremiumTheme = option.id !== "neutral";
                    const isLocked = isPremiumTheme && !canUsePremiumColorThemes;
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
                                    borderWidth: isActive ? 0.5 : 0,
                                },
                            ]}
                            onPress={() => {
                                if (isLocked) {
                                    router.push("/settings/premium");
                                    return;
                                }

                                setColorTheme(option.id);
                            }}
                        >
                            {isLocked && (
                                <View style={styles.plusBadge}>
                                    <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                                </View>
                            )}
                            {isActive ? (
                                <SelectionCheckmark />
                            ) : null}
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
                                        {t(option.labelKey)}
                                    </Text>
                                    <Text style={[styles.optionDescription, { color: previewColors.textSecondary, fontSize: fontSizes.sm }]}>
                                        {t(option.descriptionKey)}
                                    </Text>
                                </View>
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
        position: "relative",
    },
    plusBadge: {
        alignItems: "center",
        backgroundColor: "#F4BA00",
        borderRadius: 999,
        height: 28,
        justifyContent: "center",
        position: "absolute",
        right: 12,
        top: 12,
        width: 28,
        zIndex: 2,
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

});
