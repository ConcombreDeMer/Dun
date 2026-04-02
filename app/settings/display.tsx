import Headline from "@/components/headline";
import SecondaryButton from "@/components/secondaryButton";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useFont, type FontSize } from "../../lib/FontContext";
import { colorThemeOptions, useTheme } from "../../lib/ThemeContext";

export default function Display() {
    const router = useRouter();
    const { theme, colorTheme, colors, setTheme } = useTheme();
    const { fontSize, setFontSize, fontSizes } = useFont();
    const activeColorTheme = colorThemeOptions.find((option) => option.id === colorTheme) ?? colorThemeOptions[0];

    const handleAbout = () => {
        Alert.alert(
            "À propos",
            "Dun - Gestionnaire de tâches\nVersion 1.0.0\n\nUne application simple et élégante pour gérer vos tâches quotidiennes.\n\n© 2025 Dun. Tous droits réservés."
        );
    };

    const ThemePreviewBox = ({ previewTheme, title }: { previewTheme: 'light' | 'dark' | 'system'; title: string }) => {
        const isActive = theme === previewTheme;
        const colors_temp = previewTheme === 'light' ? { bg: '#ffffff', text: '#000000' } : previewTheme === 'dark' ? { bg: '#1a1a1a', text: '#ffffff' } : { bg: '#e6e6e6', text: '#3d3d3d' };
        const borderColor = isActive ? colors.text : colors.border;
        const borderWidth = isActive ? 2 : 1;

        return (
            <SquircleButton
                style={[
                    styles.themePreview,
                    {
                        backgroundColor: colors_temp.bg,
                        borderColor,
                        borderWidth,
                    },
                ]}
                onPress={() => {
                    if (previewTheme === 'system') {
                        setTheme('system');
                    } else if (previewTheme === 'dark') {
                        setTheme('dark');
                    } else if (previewTheme === 'light') {
                        setTheme('light');
                    }
                }}
            >
                <View
                    style={{
                        width: "100%",
                        alignItems: "center",
                    }}
                >
                    <View
                        style={[
                            styles.themePreviewContent,
                            { backgroundColor: previewTheme === 'light' ? '#f5f5f5' : previewTheme === 'dark' ? '#2a2a2a' : '#d8d8d8' },
                        ]}
                    >
                        <View
                            style={{
                                width: '100%',
                                height: 4,
                                backgroundColor: previewTheme === 'light' ? '#e0e0e0' : previewTheme === 'dark' ? '#404040' : '#c8c8c8',
                                borderRadius: 2,
                            }}
                        />
                        <View
                            style={{
                                width: '70%',
                                height: 3,
                                backgroundColor: previewTheme === 'light' ? '#e0e0e0' : previewTheme === 'dark' ? '#404040' : '#c8c8c8',
                                borderRadius: 2,
                                marginTop: 4,
                            }}
                        />
                    </View>
                    <Text style={[styles.themeTitle, { color: colors_temp.text, fontSize: fontSizes.base }]}>
                        {title}
                    </Text>
                </View>
                {isActive && (
                    <View style={[styles.checkmark, { backgroundColor: colors.text }]}>
                        <Text style={[styles.checkmarkIcon, { color: colors.background }]}>✓</Text>
                    </View>
                )}
            </SquircleButton>
        );
    };

    const FontSizeOption = ({ size, label }: { size: FontSize; label: string }) => {
        const isActive = fontSize === size;
        const sizeMap = {
            small: 13,
            medium: 16,
            large: 19,
        };

        return (
            <SquircleButton
                style={[
                    styles.optionButton,
                    {
                        backgroundColor: isActive ? colors.button : colors.card,
                        borderColor: isActive ? colors.button : colors.border,
                        borderWidth: 1,
                    },
                ]}
                onPress={() => setFontSize(size)}
            >
                <Text
                    style={[
                        styles.optionLabel,
                        {
                            color: isActive ? colors.buttonText : colors.text,
                            fontSize: sizeMap[size],
                        },
                    ]}
                >
                    {label}
                </Text>
            </SquircleButton>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={{ marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 20 }}
            >
                <SecondaryButton
                    onPress={() => router.back()}
                    image="chevron.left"
                />
                <Headline title="Affichage" subtitle="Personnaliser votre interface" />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        Thème
                    </Text>
                    <View style={styles.themeContainer}>
                        <ThemePreviewBox previewTheme="light" title="Clair" />
                        <ThemePreviewBox previewTheme="dark" title="Sombre" />
                        <ThemePreviewBox previewTheme="system" title="Système" />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        Coloris actuel
                    </Text>
                    <SquircleButton
                        style={[styles.colorRow, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                        onPress={() => router.push("/settings/colors")}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.colorRowTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
                                {activeColorTheme.label}
                            </Text>
                            <Text style={[styles.colorRowDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                                {activeColorTheme.description}
                            </Text>
                        </View>
                        <View style={styles.swatchRow}>
                            {activeColorTheme.preview.map((swatch) => (
                                <View
                                    key={swatch}
                                    style={[styles.swatch, { backgroundColor: swatch }]}
                                />
                            ))}
                        </View>
                    </SquircleButton>
                </View>

                {/* Font Size Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        Taille du texte
                    </Text>
                    <View style={styles.optionGroup}>
                        <FontSizeOption size="small" label="Aa" />
                        <FontSizeOption size="medium" label="Aa" />
                        <FontSizeOption size="large" label="Aa" />
                    </View>
                </View>

                {/* Display Density Section */}
                {/* <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        Espacement
                    </Text>
                    <View style={styles.densityGroup}>
                        <DensityOption density="compact" label="Compact" icon="compress" />
                        <DensityOption density="comfortable" label="Confortable" icon="box" />
                        <DensityOption density="spacious" label="Spacieux" icon="expand" />
                    </View>
                </View> */}

                {/* About Button */}
                <SquircleButton
                    onPress={handleAbout}
                    style={[
                        styles.aboutButton,
                        { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <SymbolView
                            name={"book.pages"}
                            style={{ width: 24, height: 24 }}
                            type="palette"
                            tintColor={colors.text}
                        />
                        <Text style={[styles.aboutText, { color: colors.text, fontSize: fontSizes.lg }]}>
                            À propos
                        </Text>
                    </View>
                    <SymbolView
                        name={"ellipsis"}
                        style={{ width: 24, height: 24 }}
                        type="palette"
                        tintColor={colors.text}
                    />
                </SquircleButton>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 60,
        backgroundColor: "#fff",
    },

    scrollContent: {
        marginTop: 20,
        paddingBottom: 120,
        gap: 24,
    },

    section: {
        gap: 12,
    },

    sectionTitle: {
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    helperText: {
        fontFamily: "Satoshi-Regular",
        marginLeft: 12,
    },

    themeContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
    },

    themePreview: {
        width: "48%",
        borderRadius: 15,
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 112,
    },

    themePreviewContent: {
        width: "100%",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginBottom: 8,
    },

    themeTitle: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
        marginBottom: 8,
    },

    swatchRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 10,
    },

    swatch: {
        width: 16,
        height: 16,
        borderRadius: 999,
    },

    colorRow: {
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
    },

    colorRowTitle: {
        fontFamily: "Satoshi-Bold",
        marginBottom: 4,
    },

    colorRowDescription: {
        fontFamily: "Satoshi-Regular",
    },

    checkmark: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },

    checkmarkIcon: {
        color: "#fff",
        fontWeight: "bold",
    },

    optionGroup: {
        flexDirection: "row",
        gap: 12,
    },

    optionButton: {
        flex: 1,
        borderRadius: 15,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        height: 50,
    },

    optionLabel: {
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },

    densityGroup: {
        gap: 12,
    },

    densityOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        height: 50,
    },

    densityLabel: {
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },

    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginTop: 12,
    },

    infoIcon: {
        fontWeight: "bold",
    },

    infoText: {
        fontFamily: "Satoshi-Regular",
        flex: 1,
        lineHeight: 18,
    },

    aboutButton: {
        borderRadius: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        height: 64,
    },

    aboutText: {
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
});
