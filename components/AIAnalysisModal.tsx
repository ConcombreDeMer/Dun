import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface AIAnalysisModalProps {
  visible: boolean;
  analysis: string;
  loading: boolean;
  error?: string;
  onClose: () => void;
}

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  visible,
  analysis,
  loading,
  error,
  onClose,
}) => {
  const { colors, theme } = useTheme();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              💡 Analyse IA de votre journée
            </Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons
                name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  L'IA analyse votre journée...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.text }]}>
                  ⚠️ Erreur lors de l'analyse
                </Text>
                <Text
                  style={[
                    styles.errorMessage,
                    { color: colors.textSecondary },
                  ]}
                >
                  {error}
                </Text>
              </View>
            ) : (
              <View style={styles.analysisContainer}>
                <View
                  style={[
                    styles.analysisBox,
                    { backgroundColor: colors.task },
                  ]}
                >
                  <Text
                    style={[
                      styles.analysisText,
                      { color: colors.text },
                    ]}
                  >
                    {analysis}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.button }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>
              Fermer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    maxHeight: "80%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  title: {
    fontSize: 18,
    fontFamily: "Satoshi-Bold",
    flex: 1,
  },
  content: {
    maxHeight: "60%",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Satoshi-Regular",
  },
  errorContainer: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Satoshi-Bold",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: "Satoshi-Regular",
    lineHeight: 20,
  },
  analysisContainer: {
    paddingVertical: 8,
  },
  analysisBox: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  analysisText: {
    fontSize: 15,
    fontFamily: "Satoshi-Regular",
    lineHeight: 24,
  },
  closeButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: "Satoshi-Bold",
  },
});
