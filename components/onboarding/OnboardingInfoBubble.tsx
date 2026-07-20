import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { SFSymbol, SymbolView } from "expo-symbols";
import Squircle from "../Squircle";

type OnboardingInfoBubbleProps = {
  title?: ReactNode;
  body: ReactNode;
  icon?: string;
  symbolName?: SFSymbol;
  size?: "default" | "large" | "feature";
  style?: ViewStyle;
};

export default function OnboardingInfoBubble({
  title,
  body,
  icon,
  symbolName,
  size = "default",
  style,
}: OnboardingInfoBubbleProps) {
  const isLarge = size === "large";
  const isFeature = size === "feature";

  return (
    <Squircle style={[styles.bubble, isLarge ? styles.largeBubble : null, isFeature ? styles.featureBubble : null, style]}>
      {symbolName ? (
        <SymbolView
          name={symbolName}
          size={isFeature ? 24 : isLarge ? 22 : 18}
          tintColor="#141414"
          type="monochrome"
        />
      ) : icon ? (
        <Text style={[styles.icon, isLarge ? styles.largeIcon : null, isFeature ? styles.featureIcon : null]}>{icon}</Text>
      ) : null}
      <View style={styles.copy}>
        {title ? <Text style={[styles.title, isLarge ? styles.largeTitle : null, isFeature ? styles.featureTitle : null]}>{title}</Text> : null}
        <Text style={[styles.body, isLarge ? styles.largeBody : null, isFeature ? styles.featureBody : null]}>{body}</Text>
      </View>
    </Squircle>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  largeBubble: {
    borderRadius: 16,
    minHeight: 104,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  featureBubble: {
    borderRadius: 16,
    minHeight: 128,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  icon: {
    fontSize: 18,
    lineHeight: 20,
  },
  largeIcon: {
    fontSize: 22,
    lineHeight: 25,
  },
  featureIcon: {
    fontSize: 24,
    lineHeight: 28,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: "#111111",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 5,
  },
  largeTitle: {
    fontSize: 21,
    lineHeight: 25,
  },
  featureTitle: {
    fontFamily: "Inter_24pt-Regular",
    fontSize: 17,
    lineHeight: 21,
    marginBottom: 12,
  },
  body: {
    color: "#8A8A8A",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 12,
    lineHeight: 15,
  },
  largeBody: {
    fontSize: 21,
    lineHeight: 25,
  },
  featureBody: {
    color: "#929292",
    fontFamily: "Inter_24pt-Light",
    fontSize: 14,
    lineHeight: 17,
  },
});
