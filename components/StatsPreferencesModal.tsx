import { StatsPreferenceKey, StatsPreferences } from "@/lib/calculateStats";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { BottomSheet, Group, Host, RNHostView, Toggle, VStack } from "@expo/ui/swift-ui";
import { disabled, opacity, padding, presentationDetents, presentationDragIndicator, toggleStyle } from "@expo/ui/swift-ui/modifiers";
import { SFSymbol, SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

type StatsPreferencesModalProps = {
  isVisible: boolean;
  isPreferencePending: (key: StatsPreferenceKey) => boolean;
  preferences: StatsPreferences;
  onPreferenceChange: (key: StatsPreferenceKey, value: boolean) => void;
  onClose: () => void;
};

export default function StatsPreferencesModal({
  isVisible,
  isPreferencePending,
  preferences,
  onPreferenceChange,
  onClose,
}: StatsPreferencesModalProps) {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();

  const options: { key: StatsPreferenceKey; label: string; systemImage: SFSymbol }[] = [
    { key: "includeToday", label: t("stats.general.preferences.includeToday"), systemImage: "sun.max" },
    { key: "includeFutureDays", label: t("stats.general.preferences.includeFutureDays"), systemImage: "calendar.badge.clock" },
    { key: "includeEmptyDays", label: t("stats.general.preferences.includeEmptyDays"), systemImage: "calendar" },
    { key: "includeRestDays", label: t("stats.general.preferences.includeRestDays"), systemImage: "moon.zzz" },
  ];

  const updatePreference = (key: StatsPreferenceKey, value: boolean) => {
    onPreferenceChange(key, value);
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Host style={styles.host}>
        <BottomSheet
          isPresented={isVisible}
          onIsPresentedChange={(presented) => {
            if (!presented) {
              onClose();
            }
          }}
          fitToContents
        >
          <Group modifiers={[presentationDragIndicator("visible"), presentationDetents([{ height: 430 }, "medium"])]}>
            <VStack spacing={16}>
              <RNHostView matchContents>
                <View style={[styles.header]}>
                  <SymbolView name="slider.horizontal.3" size={42} tintColor={colors.text} />
                  <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
                    {t("stats.general.preferences.title")}
                  </Text>
                  <Text style={[styles.message, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                    {t("stats.general.preferences.message")}
                  </Text>
                </View>
              </RNHostView>

              <VStack
                spacing={14}
                modifiers={[padding({ horizontal: 28 })]}
              >
                {options.map((option) => (
                  <Toggle
                    key={option.key}
                    isOn={preferences[option.key]}
                    onIsOnChange={(isOn) => updatePreference(option.key, isOn)}
                    label={option.label}
                    systemImage={option.systemImage}
                    modifiers={[
                      toggleStyle("switch"),
                      disabled(isPreferencePending(option.key)),
                      opacity(isPreferencePending(option.key) ? 0.55 : 1),
                    ]}
                  />
                ))}
              </VStack>
            </VStack>
          </Group>
        </BottomSheet>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
    width: "100%",
  },
  title: {
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },
  message: {
    fontFamily: "Satoshi-Medium",
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: "100%",
  },
});
