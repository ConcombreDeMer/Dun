/*
 * Shown instead of the app when the local database cannot be opened or
 * migrated. No data is deleted: restarting Dun tries again.
 */

import { StyleSheet, Text, View } from "react-native";
import { useFont } from "../../lib/FontContext";
import { useAppTranslation } from "../../lib/i18n";
import { useTheme } from "../../lib/ThemeContext";

export default function DatabaseErrorScreen() {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: colors.text, fontSize: fontSizes["3xl"] },
        ]}
      >
        {t("databaseError.title")}
      </Text>
      <Text
        style={[
          styles.message,
          { color: colors.textSecondary, fontSize: fontSizes.lg },
        ]}
      >
        {t("databaseError.message")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },
  message: {
    fontFamily: "Satoshi-Regular",
    textAlign: "center",
  },
});
