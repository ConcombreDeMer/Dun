import Headline from "@/components/headline";
import SecondaryButton from "@/components/secondaryButton";
import SwitchItem from "@/components/switchItem";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../../lib/ThemeContext";
import { getImageSource } from "../../lib/imageHelper";

type FontSize = 'small' | 'medium' | 'large';
type DisplayDensity = 'compact' | 'comfortable' | 'spacious';

export default function Display() {
    const router = useRouter();
    const { theme, toggleTheme, colors } = useTheme();
    const [fontSize, setFontSize] = useState<FontSize>('medium');
    const [density, setDensity] = useState<DisplayDensity>('comfortable');

    const handleAbout = () => {
        Alert.alert(
            "À propos",
            "Dun - Gestionnaire de tâches\nVersion 1.0.0\n\nUne application simple et élégante pour gérer vos tâches quotidiennes.\n\n© 2025 Dun. Tous droits réservés."
        );
    };

    const ThemePreviewBox = ({ previewTheme, title }: { previewTheme: 'light' | 'dark'; title: string }) => {
        const isActive = theme === previewTheme;
        const colors_temp = previewTheme === 'light' ? { bg: '#ffffff', text: '#000000' } : { bg: '#1a1a1a', text: '#ffffff' };

        return (
            <TouchableOpacity
                style={[
                    styles.themePreview,
                    {
                        backgroundColor: colors_temp.bg,
                        borderColor: isActive ? '#000' : '#ccc',
                        borderWidth: isActive ? 2 : 1,
                    },
                ]}
                onPress={() => previewTheme !== theme && toggleTheme()}
            >
                <View
                    style={[
                        styles.themePreviewContent,
                        { backgroundColor: previewTheme === 'light' ? '#f5f5f5' : '#2a2a2a' },
                    ]}
                >
                    <View
                        style={{
                            width: '100%',
                            height: 4,
                            backgroundColor: previewTheme === 'light' ? '#e0e0e0' : '#404040',
                            borderRadius: 2,
                        }}
                    />
                    <View
                        style={{
                            width: '70%',
                            height: 3,
                            backgroundColor: previewTheme === 'light' ? '#e0e0e0' : '#404040',
                            borderRadius: 2,
                            marginTop: 4,
                        }}
                    />
                </View>
                <Text style={[styles.themeTitle, { color: colors_temp.text }]}>
                    {title}
                </Text>
                {isActive && (
                    <View style={styles.checkmark}>
                        <Text style={styles.checkmarkIcon}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
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
            <TouchableOpacity
                style={[
                    styles.optionButton,
                    { backgroundColor: isActive ? colors.button : colors.card },
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
            </TouchableOpacity>
        );
    };

    const DensityOption = ({ density: dens, label, icon }: { density: DisplayDensity; label: string; icon: string }) => {
        const isActive = density === dens;

        return (
            <TouchableOpacity
                style={[
                    styles.densityOption,
                    { backgroundColor: isActive ? colors.button : colors.card },
                ]}
                onPress={() => setDensity(dens)}
            >
                <Image
                    style={{
                        width: 24,
                        height: 24,
                        tintColor: isActive ? colors.buttonText : colors.text,
                    }}
                    source={getImageSource(icon, theme)}
                />
                <Text
                    style={[
                        styles.densityLabel,
                        { color: isActive ? colors.buttonText : colors.text },
                    ]}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={{ marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 20 }}
            >
                <SecondaryButton
                    onPress={() => router.back()}
                    image="back"
                />
                <Headline title="Affichage" subtitle="Personnaliser votre interface" />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Thème
                    </Text>
                    <View style={styles.themeContainer}>
                        <ThemePreviewBox previewTheme="light" title="Clair" />
                        <ThemePreviewBox previewTheme="dark" title="Sombre" />
                    </View>
                </View>

                {/* Auto Theme Section */}
                <View style={styles.section}>
                    <SwitchItem
                        image="auto"
                        title="Thème auto"
                        currentValue={false}
                    />
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                        Utilise les préférences de votre système
                    </Text>
                </View>

                {/* Font Size Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Taille du texte
                    </Text>
                    <View style={styles.optionGroup}>
                        <FontSizeOption size="small" label="Aa" />
                        <FontSizeOption size="medium" label="Aa" />
                        <FontSizeOption size="large" label="Aa" />
                    </View>
                </View>

                {/* Display Density Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Espacement
                    </Text>
                    <View style={styles.densityGroup}>
                        <DensityOption density="compact" label="Compact" icon="compress" />
                        <DensityOption density="comfortable" label="Confortable" icon="box" />
                        <DensityOption density="spacious" label="Spacieux" icon="expand" />
                    </View>
                </View>

                {/* Info Section */}
                <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                    <View
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: colors.button,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={[styles.infoIcon, { color: colors.buttonText }]}>ℹ</Text>
                    </View>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Les préférences d'affichage s'appliquent immédiatement
                    </Text>
                </View>

                {/* About Button */}
                <TouchableOpacity
                    onPress={handleAbout}
                    style={[
                        styles.aboutButton,
                        { backgroundColor: colors.card },
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Image
                            style={{ width: 24, height: 24, tintColor: colors.text }}
                            source={getImageSource('info', theme)}
                        />
                        <Text style={[styles.aboutText, { color: colors.text }]}>
                            À propos
                        </Text>
                    </View>
                    <Image
                        style={{ width: 24, height: 24, tintColor: colors.text }}
                        source={getImageSource('chevron', theme)}
                    />
                </TouchableOpacity>
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
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    helperText: {
        fontSize: 13,
        fontFamily: "Satoshi-Regular",
        marginLeft: 12,
    },

    themeContainer: {
        flexDirection: "row",
        gap: 12,
    },

    themePreview: {
        flex: 1,
        borderRadius: 12,
        overflow: "hidden",
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
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
        fontSize: 14,
        fontWeight: "bold",
    },

    optionGroup: {
        flexDirection: "row",
        gap: 12,
    },

    optionButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
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
        fontSize: 16,
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
        fontSize: 18,
        fontWeight: "bold",
    },

    infoText: {
        fontSize: 13,
        fontFamily: "Satoshi-Regular",
        flex: 1,
        lineHeight: 18,
    },

    aboutButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 12,
        padding: 16,
        height: 64,
    },

    aboutText: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
});
