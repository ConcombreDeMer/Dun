import { getStatsJsonDataString } from "@/lib/ai/getStatsJsonData";
import type { StatsDay, StatsPeriod, StatsPreferences } from "@/lib/calculateStats";
import { useTheme } from "@/lib/ThemeContext";
import {
  analyzeStatsWithFoundationAI,
  isFoundationAIAvailable,
  prewarmFoundationAI,
} from "@/modules/dun-foundation-ai";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type StatsAiResponsesProps = {
  activeSlide: {
    id: string;
    periodLabel: string;
  } | null;
  days: StatsDay[];
  period: StatsPeriod;
  preferences: StatsPreferences;
};

export default function StatsAiResponses({
  activeSlide,
  days,
  period,
  preferences,
}: StatsAiResponsesProps) {
  const { colors } = useTheme();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");

  const jsonPayload = useMemo(
    () => getStatsJsonDataString({
      allDays: days,
      period,
      preferences,
      slide: activeSlide,
    }),
    [activeSlide, days, period, preferences]
  );

  useEffect(() => {
    let isMounted = true;

    const prepareAI = async () => {
      try {
        const available = await isFoundationAIAvailable();
        if (!isMounted) return;

        setIsAvailable(available);

        if (available) {
          void prewarmFoundationAI();
        }
      } catch {
        if (isMounted) {
          setIsAvailable(false);
        }
      }
    };

    void prepareAI();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setResponse("");
    setError("");
  }, [jsonPayload]);

  const handleAnalyze = async () => {
    if (isGenerating || !activeSlide) return;

    setIsGenerating(true);
    setError("");

    try {
      const nextResponse = await analyzeStatsWithFoundationAI(jsonPayload);
      setResponse(nextResponse);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible d'analyser les statistiques pour le moment.");
    } finally {
      setIsGenerating(false);
    }
  };

  const disabled = isGenerating || isAvailable === false || isAvailable === null || !activeSlide;

  return (
    <View style={styles.container}>
      <Pressable
        disabled={disabled}
        onPress={handleAnalyze}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: disabled ? colors.border : colors.text,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        {isGenerating ? (
          <ActivityIndicator color={colors.background} size="small" />
        ) : (
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Analyser mes stats
          </Text>
        )}
      </Pressable>

      {isAvailable === false ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {"Apple Foundation Models n'est pas disponible sur cet appareil."}
        </Text>
      ) : null}

      {error ? (
        <Text style={[styles.message, { color: "#c83232" }]}>
          {error}
        </Text>
      ) : null}

      {response ? (
        <Text style={[styles.response, { color: colors.text }]}>
          {response}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 25,
    width: "100%",
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    fontFamily: "Satoshi-Bold",
    fontSize: 15,
  },
  message: {
    fontFamily: "Satoshi-Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  response: {
    fontFamily: "Satoshi-Regular",
    fontSize: 15,
    lineHeight: 22,
  },
});
