import Headline from "@/components/headline";
import SecondaryButton from "@/components/secondaryButton";
import SelectionCheckmark from "@/components/SelectionCheckmark";
import { useFont, type FontSize } from "@/lib/FontContext";
import { AppLanguage, useAppTranslation } from "@/lib/i18n";
import { useSubscription } from "@/lib/subscription";
import { colorThemeOptions, useTheme } from "@/lib/ThemeContext";
import { DEFAULT_CALENDAR_PREFERENCE, useCalendarPreference, type CalendarPreference } from "@/lib/useCalendarPreference";
import { DEFAULT_PROGRESS_BAR_PREFERENCE, useProgressBarPreference, type ProgressBarPreference } from "@/lib/useProgressBarPreference";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function Display() {
    const router = useRouter();
    const { t, language, setLanguage, supportedLanguages } = useAppTranslation();
    const { theme, colorTheme, colors, setTheme } = useTheme();
    const { fontSize, setFontSize, fontSizes } = useFont();
    const { isPremium, isLoading: isSubscriptionLoading } = useSubscription();
    const {
        preference: calendarPreference,
        setPreference: setCalendarPreference,
        isSaving: isSavingCalendarPreference,
        isPreferenceLoaded: isCalendarPreferenceLoaded,
        error: calendarPreferenceError,
    } = useCalendarPreference();
    const {
        preference: progressBarPreference,
        setPreference: setProgressBarPreference,
        isSaving: isSavingProgressBarPreference,
        isPreferenceLoaded: isProgressBarPreferenceLoaded,
        error: progressBarPreferenceError,
    } = useProgressBarPreference();
    const activeColorTheme = colorThemeOptions.find((option) => option.id === colorTheme) ?? colorThemeOptions[0];
    const effectiveCalendarPreference = isPremium
        ? calendarPreference
        : DEFAULT_CALENDAR_PREFERENCE;
    const effectiveProgressBarPreference = isPremium
        ? progressBarPreference
        : DEFAULT_PROGRESS_BAR_PREFERENCE;

    useEffect(() => {
        if (
            isSubscriptionLoading ||
            !isCalendarPreferenceLoaded ||
            isSavingCalendarPreference ||
            calendarPreferenceError ||
            isPremium ||
            calendarPreference !== 2
        ) {
            return;
        }

        setCalendarPreference(DEFAULT_CALENDAR_PREFERENCE);
    }, [
        calendarPreference,
        calendarPreferenceError,
        isCalendarPreferenceLoaded,
        isPremium,
        isSavingCalendarPreference,
        isSubscriptionLoading,
        setCalendarPreference,
    ]);

    useEffect(() => {
        if (
            isSubscriptionLoading ||
            !isProgressBarPreferenceLoaded ||
            isSavingProgressBarPreference ||
            progressBarPreferenceError ||
            isPremium ||
            progressBarPreference !== 1
        ) {
            return;
        }

        setProgressBarPreference(DEFAULT_PROGRESS_BAR_PREFERENCE);
    }, [
        isPremium,
        isProgressBarPreferenceLoaded,
        isSavingProgressBarPreference,
        isSubscriptionLoading,
        progressBarPreference,
        progressBarPreferenceError,
        setProgressBarPreference,
    ]);

    const handleAbout = () => {
        Alert.alert(
            t("settings.display.about.title"),
            t("settings.display.about.message")
        );
    };

    const renderThemePreviewBox = (previewTheme: 'light' | 'dark' | 'system', title: string) => {
        const isActive = theme === previewTheme;
        const colors_temp = previewTheme === 'light' ? { bg: '#ffffff', text: '#000000' } : previewTheme === 'dark' ? { bg: '#1a1a1a', text: '#ffffff' } : { bg: '#e6e6e6', text: '#3d3d3d' };

        return (
            <SquircleButton
                style={[
                    styles.themePreview,
                    {
                        backgroundColor: colors_temp.bg,
                        borderColor: isActive ? colors.text : colors.border,
                        borderWidth: isActive ? 0.5 : 0,
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
                    <SelectionCheckmark />
                )}
            </SquircleButton>
        );
    };

    const renderFontSizeOption = (size: FontSize, label: string) => {
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
                        backgroundColor: colors.card,
                        borderColor: isActive ? colors.text : colors.border,
                        borderWidth: isActive ? 0.5 : 0,
                    },
                ]}
                onPress={() => setFontSize(size)}
            >
                {isActive ? (
                    <SelectionCheckmark />
                ) : null}
                <Text
                    style={[
                        styles.optionLabel,
                        {
                            color: colors.text,
                            fontSize: sizeMap[size],
                        },
                    ]}
                >
                    {label}
                </Text>
            </SquircleButton>
        );
    };

    const renderLanguageOption = (value: AppLanguage) => {
        const isActive = language === value;

        return (
            <SquircleButton
                style={[
                    styles.languageButton,
                    {
                        backgroundColor: colors.card,
                        borderColor: isActive ? colors.text : colors.border,
                        borderWidth: isActive ? 0.5 : 0,
                    },
                ]}
                onPress={() => setLanguage(value)}
            >
                {isActive ? (
                    <SelectionCheckmark />
                ) : null}
                <Text
                    style={[
                        styles.languageLabel,
                        {
                            color: colors.text,
                            fontSize: fontSizes.base,
                        },
                    ]}
                >
                    {t(`settings.display.languages.${value}`)}
                </Text>
            </SquircleButton>
        );
    };

    const renderDisplayPreviewOption = ({
        title,
        isActive,
        isSaving,
        isLocked = false,
        previewSource,
        onSelect,
    }: {
        title: string;
        isActive: boolean;
        isSaving: boolean;
        isLocked?: boolean;
        previewSource: any;
        onSelect: () => void;
    }) => {

        return (
            <SquircleButton
                style={[
                    styles.progressOption,
                    {
                        backgroundColor: colors.card,
                        borderColor: isActive ? colors.text : colors.border,
                        borderWidth: isActive ? 0.5 : 0,
                        opacity: isSaving && !isActive ? 0.66 : 1,
                    },
                ]}
                onPress={() => {
                    if (isLocked) {
                        router.push("/settings/premium");
                        return;
                    }

                    onSelect();
                }}
            >
                {isLocked ? (
                    <View style={styles.plusBadge}>
                        <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                    </View>
                ) : null}
                {isActive ? (
                    <SelectionCheckmark />
                ) : null}
                <View style={styles.progressOptionHeader}>
                    <View style={styles.progressMockupFrame}>
                        <Image
                            source={previewSource}
                            style={styles.progressPreviewImage}
                            resizeMode="contain"
                        />
                    </View>
                </View>
                <Text
                    style={[
                        styles.progressOptionTitle,
                        {
                            color: colors.text,
                            fontSize: fontSizes.base,
                        },
                    ]}
                >
                    {title}
                </Text>
            </SquircleButton>
        );
    };

    const renderProgressBarOption = (value: ProgressBarPreference, title: string) => {
        const isCircularOption = value === 1;

        return renderDisplayPreviewOption({
            title,
            isActive: effectiveProgressBarPreference === value,
            isSaving: isSavingProgressBarPreference,
            isLocked: isCircularOption && !isPremium,
            previewSource: value === 1
                ? require("@/assets/images/settings/circular.png")
                : require("@/assets/images/settings/line.png"),
            onSelect: () => setProgressBarPreference(value),
        });
    };

    const renderCalendarOption = (value: CalendarPreference, title: string) => {
        const isTextOption = value === 2;

        return renderDisplayPreviewOption({
            title,
            isActive: effectiveCalendarPreference === value,
            isSaving: isSavingCalendarPreference,
            isLocked: isTextOption && !isPremium,
            previewSource: value === 1
                ? require("@/assets/images/settings/calendar_slider.png")
                : require("@/assets/images/settings/calendar_text.png"),
            onSelect: () => setCalendarPreference(value),
        });
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
                <Headline
                    title={t("settings.display.headline.title")}
                    subtitle={t("settings.display.headline.subtitle")}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        {t("settings.display.sections.theme")}
                    </Text>
                    <View style={styles.themeContainer}>
                        {renderThemePreviewBox("light", t("settings.display.themeOptions.light"))}
                        {renderThemePreviewBox("dark", t("settings.display.themeOptions.dark"))}
                        {renderThemePreviewBox("system", t("settings.display.themeOptions.system"))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        {t("settings.display.sections.colorTheme")}
                    </Text>
                    <SquircleButton
                        style={[styles.colorRow, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                        onPress={() => router.push("/settings/colors")}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.colorRowTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
                                {t(activeColorTheme.labelKey)}
                            </Text>
                            <Text style={[styles.colorRowDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                                {t(activeColorTheme.descriptionKey)}
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

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        {t("settings.display.sections.progressBar")}
                    </Text>
                    <View style={styles.progressOptions}>
                        {renderProgressBarOption(
                            2,
                            t("settings.display.progressBar.classic.title")
                        )}
                        {renderProgressBarOption(
                            1,
                            t("settings.display.progressBar.circular.title")
                        )}
                    </View>
                    {progressBarPreferenceError ? (
                        <Text style={[styles.errorText, { color: colors.danger ?? '#D94A4A', fontSize: fontSizes.sm }]}>
                            {t("settings.display.progressBar.error")}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        {t("settings.display.sections.calendar")}
                    </Text>
                    <View style={styles.progressOptions}>
                        {renderCalendarOption(
                            1,
                            t("settings.display.calendar.slider.title")
                        )}
                        {renderCalendarOption(
                            2,
                            t("settings.display.calendar.text.title")
                        )}
                    </View>
                    {calendarPreferenceError ? (
                        <Text style={[styles.errorText, { color: colors.danger ?? '#D94A4A', fontSize: fontSizes.sm }]}>
                            {t("settings.display.calendar.error")}
                        </Text>
                    ) : null}
                </View>

                {/* Font Size Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        {t("settings.display.sections.fontSize")}
                    </Text>
                    <View style={styles.optionGroup}>
                        {renderFontSizeOption("small", "Aa")}
                        {renderFontSizeOption("medium", "Aa")}
                        {renderFontSizeOption("large", "Aa")}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                        {t("settings.display.sections.language")}
                    </Text>
                    <Text style={[styles.sectionDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                        {t("settings.display.languageDescription")}
                    </Text>
                    <View style={styles.optionGroup}>
                        {supportedLanguages.map((value) => (
                            <View key={value} style={styles.optionRenderSlot}>
                                {renderLanguageOption(value)}
                            </View>
                        ))}
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
                            {t("settings.display.about.title")}
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
    sectionDescription: {
        fontFamily: "Satoshi-Regular",
    },

    sectionTitle: {
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
        position: "relative",
    },

    colorRowTitle: {
        fontFamily: "Satoshi-Bold",
        marginBottom: 4,
    },

    colorRowDescription: {
        fontFamily: "Satoshi-Regular",
    },

    progressOptions: {
        flexDirection: "row",
        gap: 12,
    },

    progressOption: {
        flex: 1,
        borderRadius: 15,
        padding: 12,
        minHeight: 138,
        position: "relative",
    },

    plusBadge: {
        alignItems: "center",
        backgroundColor: "#F4BA00",
        borderRadius: 999,
        height: 28,
        justifyContent: "center",
        position: "absolute",
        right: 8,
        top: 8,
        width: 28,
        zIndex: 2,
    },

    progressOptionHeader: {
        minHeight: 82,
        justifyContent: "center",
        marginBottom: 10,
    },

    progressMockupFrame: {
        minHeight: 82,
        alignItems: "center",
        justifyContent: "center",
    },

    progressPreviewImage: {
        width: "100%",
        height: 82,
    },

    progressOptionTitle: {
        fontFamily: "Satoshi-Bold",
        textAlign: "center",
    },

    errorText: {
        fontFamily: "Satoshi-Medium",
    },

    optionGroup: {
        flexDirection: "row-reverse",
        gap: 12,
    },
    optionRenderSlot: {
        flex: 1,
    },
    languageButton: {
        flex: 1,
        minHeight: 52,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        position: "relative",
    },
    languageLabel: {
        fontFamily: "Satoshi-Medium",
    },

    optionButton: {
        flex: 1,
        borderRadius: 15,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        height: 50,
        position: "relative",
    },

    optionLabel: {
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
        fontFamily: "Satoshi-Bold",
    },
});
