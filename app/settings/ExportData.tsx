import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import Squircle from "@/components/Squircle";
import { deleteExportFile, exportUserData, getShareableExportUri } from "@/lib/exportData";
import { useFont } from "@/lib/FontContext";
import { getCharacterImageSource } from "@/lib/imageHelper";
import { useAppTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

const LottieView = require("lottie-react-native").default;

type ExportStatus = "loading" | "success" | "error" | "cancelled";

export default function ExportData() {
  const router = useRouter();
  const { colors, actualTheme } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<ExportStatus>("loading");
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [byteCount, setByteCount] = useState<number | null>(null);

  const formatByteCount = useCallback((bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }, []);

  const startExport = useCallback(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus("loading");

    exportUserData(controller.signal)
      .then((result) => {
        setFileUri(result.fileUri);
        setFileName(result.fileName);
        setByteCount(result.byteCount);
        setStatus("success");
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === "AbortError") {
          setStatus("cancelled");
          return;
        }

        console.error("Erreur lors de l'export des données:", error);
        setStatus("error");
        Alert.alert(t("common.alerts.errorTitle"), t("settings.account.exportData.errors.export"));
      });
  }, [t]);

  useEffect(() => {
    startExport();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [startExport]);

  const handleDownload = useCallback(async () => {
    if (!fileUri) {
      return;
    }

    try {
      const shareableUri = await getShareableExportUri(fileUri);
      await Share.share({
        title: fileName ?? t("settings.account.exportData.fileName"),
        url: shareableUri,
        message: t("settings.account.exportData.shareMessage"),
      });
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'export:", error);
      Alert.alert(t("common.alerts.errorTitle"), t("settings.account.exportData.errors.download"));
    }
  }, [fileName, fileUri, t]);

  const handleCancel = useCallback(async () => {
    abortControllerRef.current?.abort();

    try {
      await deleteExportFile(fileUri);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'export:", error);
    } finally {
      router.back();
    }
  }, [fileUri, router]);

  const renderContent = () => {
    if (status === "loading") {
      return (
        <Animated.View entering={FadeIn.duration(250)} style={styles.stateContent}>
          <LottieView
            source={require("../../assets/animations/loading.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
            {t("settings.account.exportData.loadingTitle")}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
            {t("settings.account.exportData.loadingDescription")}
          </Text>
        </Animated.View>
      );
    }

    if (status === "success") {
      return (
        <Animated.View entering={FadeInUp.springify()} style={styles.stateContent}>
          <SymbolView
            name="checkmark.circle.fill"
            size={92}
            tintColor={colors.actionButton}
            type="palette"
          />
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
            {t("settings.account.exportData.successTitle")}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
            {t("settings.account.exportData.successDescription")}
          </Text>
          {fileName && (
            <Squircle
              style={[styles.fileCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <SymbolView name="doc.text.fill" size={26} tintColor={colors.text} type="palette" />
              <View style={styles.fileTextContainer}>
                <Text
                  numberOfLines={1}
                  style={[styles.fileName, { color: colors.text, fontSize: fontSizes.md }]}
                >
                  {fileName}
                </Text>
                {byteCount !== null && (
                  <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm }}>
                    {formatByteCount(byteCount)}
                  </Text>
                )}
              </View>
            </Squircle>
          )}
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeIn.duration(250)} style={styles.stateContent}>
        <SymbolView
          name={status === "cancelled" ? "xmark.circle.fill" : "exclamationmark.triangle.fill"}
          size={86}
          tintColor={status === "cancelled" ? colors.textSecondary : colors.danger}
          type="palette"
        />
        <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
          {status === "cancelled"
            ? t("settings.account.exportData.cancelledTitle")
            : t("settings.account.exportData.errorTitle")}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
          {status === "cancelled"
            ? t("settings.account.exportData.cancelledDescription")
            : t("settings.account.exportData.errorDescription")}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SecondaryButton onPress={handleCancel} image="chevron.left" />
        <Headline
          title={t("settings.account.exportData.headline.title")}
          subtitle={t("settings.account.exportData.headline.subtitle")}
        />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Squircle style={[styles.panel, { backgroundColor: colors.card }]}>
          <View style={styles.characterContainer}>
            <Animated.Image
              entering={FadeInUp.springify()}
              source={getCharacterImageSource(status === "success" ? "6" : "7", actualTheme)}
              style={styles.character}
              resizeMode="contain"
            />
          </View>

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
        {status === "success" && (
          <PrimaryButton
            title={t("settings.account.exportData.download")}
            image="square.and.arrow.down"
            onPress={handleDownload}
            size="M"
          />
        )}

        {status === "error" && (
          <PrimaryButton
            title={t("settings.account.exportData.retry")}
            image="arrow.clockwise"
            onPress={startExport}
            size="M"
          />
        )}

        <PrimaryButton
          title={t("common.actions.cancel")}
          type="reverse"
          onPress={handleCancel}
          size="M"
        />
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
    paddingBottom: 220,
  },
  panel: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    minHeight: 480,
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
  lottie: {
    width: 130,
    height: 130,
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
  fileCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fileTextContainer: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fileName: {
    fontFamily: "Satoshi-Medium",
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
