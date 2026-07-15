import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import Squircle from "@/components/Squircle";
import { useAuthUserId } from "@/lib/AuthSessionContext";
import { DAYS_QUERY_KEY } from "@/lib/daysQueryKeys";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import {
  ParsedUserDataImport,
  readUserDataImport,
  replaceUserDataFromImport,
  UserDataImportResult,
} from "@/lib/importData";
import { profileQueryKey } from "@/lib/profile";
import { useSubscription } from "@/lib/subscription";
import { TAG_USAGE_STATS_QUERY_KEY, TAGS_QUERY_KEY } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

type ImportStatus = "idle" | "ready" | "importing" | "success" | "error";

export default function ImportData() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthUserId();
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const { isPremium, isLoading: isSubscriptionLoading } = useSubscription();
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedImport, setParsedImport] = useState<ParsedUserDataImport | null>(null);
  const [importResult, setImportResult] = useState<UserDataImportResult | null>(null);
  const shouldShowPremiumWarning = !isSubscriptionLoading && !isPremium;

  const refreshImportedData = useCallback(async () => {
    if (!userId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] }),
      queryClient.invalidateQueries({ queryKey: [...TAGS_QUERY_KEY, userId] }),
      queryClient.invalidateQueries({ queryKey: TAG_USAGE_STATS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: [DAYS_QUERY_KEY] }),
    ]);

    await queryClient.refetchQueries({ queryKey: profileQueryKey(userId), type: "active" });
  }, [queryClient, userId]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ["application/json", "text/plain"],
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const parsed = await readUserDataImport(asset.uri);
      setSelectedFileName(asset.name ?? t("settings.account.importData.fileNameFallback"));
      setParsedImport(parsed);
      setImportResult(null);
      setStatus("ready");
    } catch (error) {
      console.error("Erreur lors de la lecture de l'import:", error);
      setStatus("error");
      Alert.alert(t("common.alerts.errorTitle"), t("settings.account.importData.errors.read"));
    }
  }, [t]);

  const startImport = useCallback(() => {
    if (!parsedImport) {
      return;
    }

    Alert.alert(
      t("settings.account.importData.confirmTitle"),
      t("settings.account.importData.confirmMessage"),
      [
        {
          text: t("common.actions.cancel"),
          style: "cancel",
        },
        {
          text: t("settings.account.importData.confirmAction"),
          style: "destructive",
          onPress: () => {
            setStatus("importing");
            replaceUserDataFromImport(parsedImport.payload)
              .then(async (result) => {
                setImportResult(result);
                await refreshImportedData();
                setStatus("success");
              })
              .catch((error) => {
                console.error("Erreur lors de l'import des donnees:", error);
                setStatus("error");
                Alert.alert(t("common.alerts.errorTitle"), t("settings.account.importData.errors.import"));
              });
          },
        },
      ]
    );
  }, [parsedImport, refreshImportedData, t]);

  const formatExportDate = useCallback((value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, []);

  const renderSummary = () => {
    if (!parsedImport) {
      return null;
    }

    const summary = parsedImport.summary;
    const rows = [
      { label: t("settings.account.importData.summary.exportedAt"), value: formatExportDate(summary.exportedAt) },
      { label: t("settings.account.importData.summary.tasks"), value: `${summary.tasksCount}` },
      { label: t("settings.account.importData.summary.tags"), value: `${summary.tagsCount}` },
      { label: t("settings.account.importData.summary.days"), value: `${summary.daysCount}` },
    ];

    return (
      <Squircle style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {selectedFileName && (
          <View style={styles.fileRow}>
            <SymbolView name="doc.text.fill" size={24} tintColor={colors.text} type="palette" />
            <Text numberOfLines={1} style={[styles.fileName, { color: colors.text, fontSize: fontSizes.md }]}>
              {selectedFileName}
            </Text>
          </View>
        )}
        {rows.map((row) => (
          <View key={row.label} style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
              {row.label}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text, fontSize: fontSizes.base }]}>
              {row.value}
            </Text>
          </View>
        ))}
      </Squircle>
    );
  };

  const renderContent = () => {
    if (status === "importing") {
      return (
        <Animated.View entering={FadeIn.duration(250)} style={styles.stateContent}>
          <View style={styles.loader}>
            <ActivityIndicator color={colors.actionButton} size="large" />
          </View>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
            {t("settings.account.importData.loadingTitle")}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
            {t("settings.account.importData.loadingDescription")}
          </Text>
        </Animated.View>
      );
    }

    if (status === "success") {
      return (
        <Animated.View entering={FadeInUp.springify()} style={styles.stateContent}>
          <SymbolView name="checkmark.circle.fill" size={92} tintColor={colors.actionButton} type="palette" />
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
            {t("settings.account.importData.successTitle")}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
            {t("settings.account.importData.successDescription", {
              tasks: importResult?.tasksImported ?? 0,
              tags: importResult?.tagsImported ?? 0,
            })}
          </Text>
        </Animated.View>
      );
    }

    if (status === "error") {
      return (
        <Animated.View entering={FadeIn.duration(250)} style={styles.stateContent}>
          <SymbolView name="exclamationmark.triangle.fill" size={86} tintColor={colors.danger} type="palette" />
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
            {t("settings.account.importData.errorTitle")}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
            {t("settings.account.importData.errorDescription")}
          </Text>
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeIn.duration(250)} style={styles.stateContent}>
        <SymbolView
          name={status === "ready" ? "doc.text.magnifyingglass" : "square.and.arrow.up"}
          size={86}
          tintColor={colors.text}
          type="palette"
        />
        <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
          {status === "ready"
            ? t("settings.account.importData.readyTitle")
            : t("settings.account.importData.idleTitle")}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
          {status === "ready"
            ? t("settings.account.importData.readyDescription")
            : t("settings.account.importData.idleDescription")}
        </Text>
        {shouldShowPremiumWarning && (
          <Squircle style={[styles.warningCard, { backgroundColor: colors.background, borderColor: "#F4BA00" }]}>
            <View style={styles.warningIcon}>
              <SymbolView name="crown.fill" size={18} tintColor="#2C2405" type="palette" />
            </View>
            <View style={styles.warningText}>
              <Text style={[styles.warningTitle, { color: colors.text, fontSize: fontSizes.base }]}>
                {t("settings.account.importData.freePlanWarningTitle")}
              </Text>
              <Text style={[styles.warningDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                {t("settings.account.importData.freePlanWarningDescription")}
              </Text>
            </View>
          </Squircle>
        )}
        {renderSummary()}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SecondaryButton onPress={() => router.back()} image="chevron.left" />
        <Headline
          title={t("settings.account.importData.headline.title")}
          subtitle={t("settings.account.importData.headline.subtitle")}
        />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Squircle style={[styles.panel, { backgroundColor: colors.card }]}>
          {renderContent()}
        </Squircle>
      </ScrollView>

      <View
        style={[
          styles.buttonsContainer,
          {
            backgroundColor: colors.background,
            boxShadow: `0px -20px 40px 10px ${colors.background}`,
          },
        ]}
      >
        {(status === "idle" || status === "error") && (
          <PrimaryButton
            title={t("settings.account.importData.chooseFile")}
            image="doc.badge.plus"
            onPress={handlePickFile}
            size="M"
          />
        )}
        {status === "ready" && (
          <PrimaryButton
            title={t("settings.account.importData.import")}
            image="square.and.arrow.up"
            onPress={startImport}
            size="M"
          />
        )}
        {status === "success" && (
          <PrimaryButton
            title={t("common.actions.confirm")}
            image="checkmark"
            onPress={() => router.back()}
            size="M"
          />
        )}
        {status !== "success" && status !== "importing" && (
          <PrimaryButton
            title={t("common.actions.cancel")}
            type="reverse"
            onPress={() => router.back()}
            size="M"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 240,
  },
  panel: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    minHeight: 520,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  characterContainer: {
    height: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  character: {
    width: 132,
    height: 132,
  },
  stateContent: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  loader: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },
  description: {
    fontFamily: "Satoshi-Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  warningCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  warningIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4BA00",
  },
  warningText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  warningTitle: {
    fontFamily: "Satoshi-Bold",
  },
  warningDescription: {
    fontFamily: "Satoshi-Regular",
    lineHeight: 18,
  },
  summaryCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 6,
    padding: 16,
    gap: 10,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 4,
  },
  fileName: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Satoshi-Medium",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontFamily: "Satoshi-Regular",
  },
  summaryValue: {
    fontFamily: "Satoshi-Bold",
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    position: "absolute",
    bottom: 0,
    minHeight: 164,
    paddingBottom: 40,
  },
});
