import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { TagUsageStat } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Squircle from "./Squircle";

type HorizontalBarGraphProps = {
  data: TagUsageStat[];
  isLoading?: boolean;
  periodLabel: string;
};

type RowProps = {
  item: TagUsageStat;
  isExiting?: boolean;
  maxTotal: number;
  isSelected: boolean;
  onPress: () => void;
};

const BarRow = memo(function BarRow({ item, isExiting = false, isSelected, maxTotal, onPress }: RowProps) {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const rowProgress = useSharedValue(0);
  const totalProgress = useSharedValue(0);
  const doneProgress = useSharedValue(0);
  const detailProgress = useSharedValue(isSelected ? 1 : 0);
  const totalWidth = maxTotal > 0 ? item.total / maxTotal : 0;
  const doneWidth = item.total > 0 ? item.done / maxTotal : 0;

  useEffect(() => {
    rowProgress.value = withTiming(isExiting ? 0 : 1, { duration: 150 });
  }, [isExiting, rowProgress]);

  useEffect(() => {
    totalProgress.value = withTiming(totalWidth, { duration: 520 });
    doneProgress.value = withTiming(doneWidth, { duration: 620 });
  }, [doneProgress, doneWidth, totalProgress, totalWidth]);

  useEffect(() => {
    detailProgress.value = withTiming(isSelected ? 1 : 0, { duration: 180 });
  }, [detailProgress, isSelected]);

  const totalStyle = useAnimatedStyle(() => ({
    width: `${Math.max(totalProgress.value * 100, item.total > 0 ? 4 : 0)}%`,
  }));

  const doneStyle = useAnimatedStyle(() => ({
    width: `${Math.max(doneProgress.value * 100, item.done > 0 ? 4 : 0)}%`,
  }));

  const detailStyle = useAnimatedStyle(() => ({
    height: detailProgress.value * 18,
    opacity: detailProgress.value,
    transform: [{ scale: 0.96 + detailProgress.value * 0.04 }],
  }));

  const rowStyle = useAnimatedStyle(() => ({
    opacity: rowProgress.value,
    transform: [{ scale: 0.97 + rowProgress.value * 0.03 }],
  }));

  return (
    <Animated.View style={rowStyle}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isSelected ? colors.input : "transparent",
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <View style={styles.rowTop}>
          <View style={styles.labelWrap}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text numberOfLines={1} style={[styles.label, { color: colors.text, fontSize: fontSizes.sm }]}>
              {item.name}
            </Text>
          </View>
          <Text style={[styles.value, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            {item.done}/{item.total}
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: colors.input }]}>
          <Animated.View
            style={[
              styles.totalBar,
              { backgroundColor: item.color, opacity: 0.26 },
              totalStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.doneBar,
              { backgroundColor: item.color },
              doneStyle,
            ]}
          />
        </View>

        <Animated.View style={[styles.detailWrap, detailStyle]}>
          <Text style={[styles.detail, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            {item.total > 0
              ? `${Math.round((item.done / item.total) * 100)}%`
              : "0%"}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

export default function HorizontalBarGraph({
  data,
  isLoading = false,
  periodLabel,
}: HorizontalBarGraphProps) {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [visibleData, setVisibleData] = useState(data);
  const [exitingTagIds, setExitingTagIds] = useState<string[]>([]);
  const animatedHeight = useSharedValue(0);
  const visibleDataRef = useRef(data);
  const maxTotal = useMemo(() => Math.max(...visibleData.map((item) => item.total), 0), [visibleData]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
    };
  });

  const handleContentLayout = useCallback((height: number) => {
    const nextHeight = Math.ceil(height);

    setContainerHeight((currentHeight) => {
      if (currentHeight === null) {
        animatedHeight.value = nextHeight;
        return nextHeight;
      }

      if (Math.abs(currentHeight - nextHeight) < 1) {
        return currentHeight;
      }

      animatedHeight.value = withTiming(nextHeight, { duration: 165 });

      return nextHeight;
    });
  }, [animatedHeight]);

  const animateContainerDelta = useCallback((delta: number) => {
    if (!delta) return;

    setContainerHeight((currentHeight) => {
      if (currentHeight === null) {
        return currentHeight;
      }

      const nextHeight = Math.max(currentHeight + delta, 0);
      animatedHeight.value = withTiming(nextHeight, { duration: 140 });

      return nextHeight;
    });
  }, [animatedHeight]);

  const handlePressRow = useCallback(async (tagId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTagId((current) => {
      const next = current === tagId ? null : tagId;

      if (!current && next) {
        animateContainerDelta(18);
      } else if (current && !next) {
        animateContainerDelta(-18);
      }

      return next;
    });
  }, [animateContainerDelta]);

  useEffect(() => {
    if (!selectedTagId || visibleData.some((item) => item.tagId === selectedTagId)) {
      return;
    }

    const timer = setTimeout(() => {
      setSelectedTagId(null);
      animateContainerDelta(-18);
    }, 0);

    return () => clearTimeout(timer);
  }, [animateContainerDelta, selectedTagId, visibleData]);

  useEffect(() => {
    const currentVisible = visibleDataRef.current;
    const nextById = new Map(data.map((item) => [item.tagId, item]));
    const currentIds = new Set(currentVisible.map((item) => item.tagId));
    const removedIds = currentVisible
      .filter((item) => !nextById.has(item.tagId))
      .map((item) => item.tagId);

    const nextVisible = [
      ...currentVisible.map((item) => nextById.get(item.tagId) ?? item),
      ...data.filter((item) => !currentIds.has(item.tagId)),
    ];

    const startTimer = setTimeout(() => {
      if (removedIds.length === 0) {
        visibleDataRef.current = data;
        setVisibleData(data);
        setExitingTagIds([]);
        return;
      }

      visibleDataRef.current = nextVisible;
      setVisibleData(nextVisible);
      setExitingTagIds(removedIds);
    }, 0);

    const removeTimer = removedIds.length > 0
      ? setTimeout(() => {
        visibleDataRef.current = data;
        setVisibleData(data);
        setExitingTagIds([]);
      }, 155)
      : undefined;

    return () => {
      clearTimeout(startTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, [data]);

  return (
    <Squircle
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
        containerHeight !== null ? animatedContainerStyle : null,
      ]}
    >
      <View
        onLayout={(event) => handleContentLayout(event.nativeEvent.layout.height)}
        style={styles.content}
      >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes.base }]}>
            {t("stats.general.tags.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            {periodLabel}
          </Text>
        </View>

        <SymbolView name="tag" size={28} tintColor={colors.textSecondary} />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.text, opacity: 0.28 }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            {t("stats.general.tags.total")}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.text }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
            {t("stats.general.tags.done")}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : visibleData.length === 0 ? (
        <View style={styles.state}>
          <SymbolView name="tag" size={28} tintColor={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
            {t("stats.general.tags.empty")}
          </Text>
        </View>
      ) : (
        <View style={styles.rows}>
          {visibleData.map((item) => (
            <BarRow
              key={item.tagId}
              item={item}
              isExiting={exitingTagIds.includes(item.tagId)}
              maxTotal={maxTotal}
              isSelected={selectedTagId === item.tagId}
              onPress={() => handlePressRow(item.tagId)}
            />
          ))}
        </View>
      )}
      </View>
    </Squircle>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderRadius: 30,
    borderWidth: 1,
    marginTop: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.1)',
    width: "90%",
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "Satoshi-Bold",
  },
  subtitle: {
    fontFamily: "Satoshi-Medium",
    marginTop: 2,
  },
  legend: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  legendLine: {
    borderRadius: 999,
    height: 8,
    width: 18,
  },
  legendText: {
    fontFamily: "Satoshi-Medium",
  },
  rows: {
    gap: 10,
    marginTop: 14,
  },
  row: {
    borderRadius: 16,
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  colorDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  label: {
    flex: 1,
    fontFamily: "Satoshi-Bold",
  },
  value: {
    fontFamily: "Satoshi-Bold",
    marginLeft: 10,
  },
  track: {
    borderRadius: 999,
    height: 18,
    overflow: "hidden",
    position: "relative",
  },
  totalBar: {
    borderRadius: 999,
    bottom: 3,
    left: 0,
    position: "absolute",
    top: 3,
  },
  doneBar: {
    borderRadius: 999,
    bottom: 6,
    left: 0,
    position: "absolute",
    top: 6,
  },
  detail: {
    fontFamily: "Satoshi-Medium",
    textAlign: "right",
  },
  detailWrap: {
    overflow: "hidden",
  },
  state: {
    alignItems: "center",
    gap: 8,
    minHeight: 116,
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Satoshi-Medium",
    textAlign: "center",
  },
});
