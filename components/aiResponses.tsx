import { getJsonDataString, type AiTaskInput } from "@/lib/ai/getJsonData";
import { TAGS_QUERY_KEY, getTags } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import {
  analyzeDayWithFoundationAI,
  isFoundationAIAvailable,
  prewarmFoundationAI,
} from "@/modules/dun-foundation-ai";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type AiResponsesProps = {
  dateKey: string;
  tasks: AiTaskInput[];
};

export default function AiResponses({ dateKey, tasks }: AiResponsesProps) {
  const { colors } = useTheme();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const { data: tags = [] } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: getTags,
    staleTime: 1000 * 60 * 15,
  });

  const jsonPayload = useMemo(
    () => getJsonDataString({ dateKey, tags, tasks }),
    [dateKey, tags, tasks]
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
  }, [dateKey]);

  const handleAnalyze = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError("");

    try {
      const nextResponse = await analyzeDayWithFoundationAI(jsonPayload);
      setResponse(nextResponse);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Impossible d'analyser la journee pour le moment.");
    } finally {
      setIsGenerating(false);
    }
  };

  const disabled = isGenerating || isAvailable === false || isAvailable === null;

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
            Analyser ma journée
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
    paddingHorizontal: 25,
    gap: 10,
  },
  button: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
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
