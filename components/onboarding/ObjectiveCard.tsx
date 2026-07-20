import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Squircle from "../Squircle";

type ObjectiveCardProps = {
  title?: string;
  duration: string;
  dayCount?: number;
  dayUnitLabel?: string;
  longTermLabels?: LongTermLabels;
  variant?: "objective" | "longTerm";
  style?: ViewStyle;
};

type LongTermLabels = {
  firstGoal: string;
  flow: string;
  mastery: string;
};

export default function ObjectiveCard({
  title = "Premier objectif",
  duration,
  dayCount: explicitDayCount,
  dayUnitLabel = "j",
  longTermLabels = {
    firstGoal: "1er objectif",
    flow: "Flow",
    mastery: "Maîtrise",
  },
  variant = "objective",
  style,
}: ObjectiveCardProps) {
  const shimmerProgress = useSharedValue(-1);
  const cardScale = useSharedValue(0.96);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    cardScale.value = withSpring(1, {
      damping: 18,
      mass: 0.7,
      stiffness: 180,
    });
    shimmerProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1550,
          easing: Easing.inOut(Easing.cubic),
        }),
        withDelay(2600, withTiming(-1, { duration: 1 }))
      ),
      -1,
      false
    );
  }, [cardOpacity, cardScale, shimmerProgress]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -150 + shimmerProgress.value * 340 },
      { rotate: "19deg" },
    ],
  }));

  const isLongTerm = variant === "longTerm";
  const dayCount = explicitDayCount ?? getDayCount(duration);
  const streakSource = isLongTerm
    ? require("@/assets/images/stats/streak/high.png")
    : require("@/assets/images/stats/streak/medium.png");

  return (
    <Animated.View style={[animatedCardStyle, style]}>
      <Squircle
        style={[
          styles.card,
          isLongTerm ? styles.longTermCard : styles.objectiveCard,
        ]}
      >
        <LinearGradient
          colors={
            isLongTerm
              ? ["#FFE17A", "#FFF8CB", "#D59614"]
              : ["#C88447", "#FFE0B8", "#9C5726"]
          }
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: isLongTerm ? "#D9A81A" : "#A76532", borderRadius: 18 }]}
        />
        <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerAnimatedStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.label, isLongTerm ? styles.longTermText : null]}>{title}</Text>
            <Text style={[styles.duration, isLongTerm ? styles.longTermText : null]}>{duration}</Text>
          </View>
          <Image
            contentFit="contain"
            source={streakSource}
            style={[styles.flame, isLongTerm ? styles.longTermFlame : styles.objectiveFlame]}
          />
        </View>
        {isLongTerm ? (
          <LongTermAchievement labels={longTermLabels} />
        ) : (
          <ObjectiveCountdown dayCount={dayCount} dayUnitLabel={dayUnitLabel} />
        )}
      </Squircle>
    </Animated.View>
  );
}

function LongTermAchievement({ labels }: { labels: LongTermLabels }) {
  return (
    <View style={styles.longTermAchievement}>
      <View style={styles.longTermSeparator} />
      <View style={styles.tierRow}>
        <TierItem active label={labels.firstGoal} value="1" />
        <ProgressConnector progress={1} />
        <TierItem active label={labels.flow} value="2" />
        <ProgressConnector progress={0.5} />
        <TierItem label={labels.mastery} value="•" />
      </View>
    </View>
  );
}

function ProgressConnector({ progress }: { progress: 0.5 | 1 }) {
  const isComplete = progress === 1;

  return (
    <View style={styles.progressConnector}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressLine, isComplete ? styles.fullProgressLine : styles.halfProgressLine]} />
      </View>
      <View style={[styles.arrowHead, isComplete ? styles.fullArrowHead : styles.pendingArrowHead]} />
    </View>
  );
}

function TierItem({
  active = false,
  label,
  value,
}: {
  active?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.tierItem}>
      <View style={[styles.tierBadge, active ? styles.activeTierBadge : null]}>
        <Text style={[styles.tierBadgeText, active ? styles.activeTierBadgeText : null]}>
          {value}
        </Text>
      </View>
      <Text style={[styles.tierLabel, active ? styles.activeTierLabel : null]}>
        {label}
      </Text>
    </View>
  );
}

function ObjectiveCountdown({
  dayCount,
  dayUnitLabel,
}: {
  dayCount: number;
  dayUnitLabel: string;
}) {
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const isCompact = dayCount > 7;
  const rows = chunkDays(days, 7);

  return (
    <View style={styles.countdown}>
      <View style={styles.dayRows}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={[styles.dayGrid, isCompact ? styles.compactDayGrid : null]}>
            {row.map((day) => (
              <View
                key={day}
                style={[styles.dayToken, isCompact ? styles.compactDayToken : null]}
              >
                <Text style={[styles.dayTokenText, isCompact ? styles.compactDayTokenText : null]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.countdownTotal}>{dayCount}{dayUnitLabel}</Text>
    </View>
  );
}

function chunkDays(days: number[], chunkSize: number) {
  const rows: number[][] = [];

  for (let index = 0; index < days.length; index += chunkSize) {
    rows.push(days.slice(index, index + chunkSize));
  }

  return rows;
}

function getDayCount(duration: string) {
  if (duration === "1 jour") return 1;
  if (duration === "2 jours") return 2;
  if (duration === "3 jours") return 3;
  if (duration === "4 jours") return 4;
  if (duration === "1 semaine") return 7;
  if (duration === "2 semaines") return 14;

  const parsedDays = Number.parseInt(duration, 10);
  return Number.isFinite(parsedDays) ? parsedDays : 4;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 184,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 20,
    justifyContent: "space-between",
    boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.15)',
  },
  objectiveCard: {
    borderColor: "#A76532",
  },
  longTermCard: {
    borderColor: "#D9A81A",
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#7E431C",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 13,
    lineHeight: 16,
  },
  duration: {
    color: "#3F210D",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 30,
    lineHeight: 32,
  },
  longTermText: {
    color: "#6B4A00",
  },
  flame: {
    height: 42,
    width: 42,
  },
  objectiveFlame: {
    height: 48,
  },
  longTermFlame: {
    height: 52,
  },
  longTermAchievement: {
    bottom: 18,
    gap: 10,
    left: 18,
    position: "absolute",
    right: 18,
  },
  longTermSeparator: {
    backgroundColor: "rgba(107, 74, 0, 0.16)",
    height: 1,
    width: "100%",
  },
  tierRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  tierItem: {
    alignItems: "center",
    gap: 5,
  },
  tierBadge: {
    alignItems: "center",
    backgroundColor: "rgba(107, 74, 0, 0.12)",
    borderColor: "rgba(107, 74, 0, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  activeTierBadge: {
    backgroundColor: "#6B4A00",
    borderColor: "#FFF2A0",
    boxShadow: "0px 3px 8px rgba(107, 74, 0, 0.28)",
  },
  tierBadgeText: {
    color: "rgba(107, 74, 0, 0.42)",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 13,
    lineHeight: 16,
  },
  activeTierBadgeText: {
    color: "#FFF3B0",
  },
  tierLabel: {
    color: "rgba(107, 74, 0, 0.46)",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 10,
    lineHeight: 12,
  },
  activeTierLabel: {
    color: "#6B4A00",
  },
  progressConnector: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    height: 28,
    justifyContent: "center",
    marginBottom: 17,
    marginHorizontal: 4,
  },
  progressTrack: {
    backgroundColor: "rgba(107, 74, 0, 0.18)",
    borderRadius: 99,
    flex: 1,
    height: 3,
    overflow: "hidden",
    marginRight: 3,
  },
  progressLine: {
    backgroundColor: "#6B4A00",
    borderRadius: 99,
    height: 3,
  },
  fullProgressLine: {
    width: "100%",
  },
  halfProgressLine: {
    width: "50%",
  },
  arrowHead: {
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopWidth: 4,
    height: 0,
    width: 0,
  },
  fullArrowHead: {
    borderBottomColor: "transparent",
    borderLeftColor: "#6B4A00",
    borderTopColor: "transparent",
  },
  pendingArrowHead: {
    borderBottomColor: "transparent",
    borderLeftColor: "rgba(107, 74, 0, 0.28)",
    borderTopColor: "transparent",
  },
  countdown: {
    position: "absolute",
    width: "100%",
    left: 18,
    bottom: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  countdownTotal: {
    color: "#3F210D",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 13,
    alignSelf: "flex-end",
  },
  dayRows: {
    gap: 6,
    width: "80%",
  },
  dayGrid: {
    flexDirection: "row",
    gap: 7,
  },
  compactDayGrid: {
    gap: 5,
  },
  dayToken: {
    alignItems: "center",
    backgroundColor: "rgba(255, 238, 216, 0.56)",
    borderColor: "#7E431C",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    minWidth: 28,
    paddingHorizontal: 8,
  },
  compactDayToken: {
    height: 22,
    minWidth: 22,
    paddingHorizontal: 5,
  },
  dayTokenText: {
    color: "#4B260F",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 12,
    lineHeight: 14,
  },
  compactDayTokenText: {
    fontSize: 10,
    lineHeight: 12,
  },
  shimmer: {
    bottom: -20,
    position: "absolute",
    top: -20,
    width: 84,
  },
});
