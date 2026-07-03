import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { TagUsagePoint, TagUsageStat } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import Squircle from "./Squircle";

type HorizontalBarGraphProps = {
  data: TagUsageStat[];
  isLoading?: boolean;
  periodLabel: string;
};

type ChartPoint = {
  x: number;
  y: number;
  value: number;
};

const CHART_HEIGHT = 176;
const MIN_LINE_TOP_PADDING = 12;
const Y_AXIS_WIDTH = 34;

const buildLinePath = (points: ChartPoint[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
};

const buildAreaPath = (points: ChartPoint[], height: number) => {
  if (points.length === 0) return "";

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${buildLinePath(points)} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;
};

const getChartPoints = (
  points: TagUsagePoint[],
  width: number,
  maxValue: number
): ChartPoint[] => {
  if (points.length === 0) return [];

  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = CHART_HEIGHT - (point.total / Math.max(maxValue, 1)) * (CHART_HEIGHT - MIN_LINE_TOP_PADDING);

    return { x, y, value: point.total };
  });
};

const TagLegendRow = memo(function TagLegendRow({
  item,
  isDimmed,
  isSelected,
  onPress,
}: {
  item: TagUsageStat;
  isDimmed: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { fontSizes } = useFont();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.legendRow,
        {
          backgroundColor: isSelected ? colors.input : "transparent",
          opacity: pressed ? 0.72 : isDimmed ? 0.44 : 1,
        },
      ]}
    >
      <View style={styles.legendNameWrap}>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <Text numberOfLines={1} style={[styles.label, { color: colors.text, fontSize: fontSizes.sm }]}>
          {item.name}
        </Text>
      </View>
      <Text style={[styles.value, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
        {item.done}/{item.total}
      </Text>
    </Pressable>
  );
});

export default memo(function HorizontalBarGraph({
  data,
  isLoading = false,
  periodLabel,
}: HorizontalBarGraphProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const lineAnimationProgress = useSharedValue(1);
  const chartWidth = Math.max(1, Math.min(screenWidth * 0.9, 520) - 36);
  const graphWidth = Math.max(1, chartWidth - Y_AXIS_WIDTH);
  const axisPoints = data.find((item) => item.points?.length)?.points ?? [];
  const maxValue = useMemo(
    () => Math.max(1, ...data.flatMap((item) => (item.points ?? []).map((point) => point.total))),
    [data]
  );
  const scaleValues = useMemo(() => [maxValue, Math.round(maxValue / 2), 0], [maxValue]);

  useEffect(() => {
    if (isLoading || data.length === 0) {
      lineAnimationProgress.value = 0;
      return;
    }

    lineAnimationProgress.value = 0;
    lineAnimationProgress.value = withTiming(1, {
      duration: 680,
      easing: Easing.out(Easing.cubic),
    });
  }, [data, isLoading, lineAnimationProgress]);

  const lineRevealStyle = useAnimatedStyle(() => ({
    opacity: lineAnimationProgress.value,
    transform: [{ translateY: (1 - lineAnimationProgress.value) * CHART_HEIGHT }],
  }));

  const chartLines = useMemo(() => data.map((item, index) => {
    const points = getChartPoints(item.points ?? [], graphWidth, maxValue);

    return {
      item,
      areaPath: buildAreaPath(points, CHART_HEIGHT),
      gradientId: `tagGradient-${item.tagId.replace(/[^a-zA-Z0-9_-]/g, "-")}-${index}`,
      linePath: buildLinePath(points),
      points,
    };
  }), [data, graphWidth, maxValue]);

  const handlePressTag = useCallback(async (tagId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTagId((current) => current === tagId ? null : tagId);
  }, []);

  return (
    <Squircle style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.content}>
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

        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : data.length === 0 ? (
          <View style={styles.state}>
            <SymbolView name="tag" size={28} tintColor={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
              {t("stats.general.tags.empty")}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartWrap}>
              <View style={styles.yAxis} pointerEvents="none">
                {scaleValues.map((value, index) => (
                  <Text
                    key={`tag-scale-${index}`}
                    numberOfLines={1}
                    style={[styles.yAxisLabel, { color: colors.textSecondary, fontSize: fontSizes.xs }]}
                  >
                    {value}
                  </Text>
                ))}
              </View>

              <View style={[styles.gridLayer, { left: Y_AXIS_WIDTH }]} pointerEvents="none">
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
              </View>

              <Animated.View style={[styles.chartSvg, { left: Y_AXIS_WIDTH }, lineRevealStyle]}>
                <Svg width={graphWidth} height={CHART_HEIGHT}>
                  <Defs>
                    {chartLines.map(({ gradientId, item }) => (
                      <SvgLinearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={item.color} stopOpacity="0.24" />
                        <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.02" />
                      </SvgLinearGradient>
                    ))}
                  </Defs>

                  {chartLines.map(({ areaPath, gradientId, item }) => {
                    const isDimmed = Boolean(selectedTagId && selectedTagId !== item.tagId);
                    return areaPath.length > 0 ? (
                      <Path
                        key={`${item.tagId}-area`}
                        d={areaPath}
                        fill={`url(#${gradientId})`}
                        opacity={isDimmed ? 0.12 : 1}
                      />
                    ) : null;
                  })}

                  {chartLines.map(({ item, linePath, points }) => {
                    const isSelected = selectedTagId === item.tagId;
                    const isDimmed = Boolean(selectedTagId && !isSelected);
                    const lastPoint = points[points.length - 1];

                    return linePath.length > 0 ? (
                      <G key={item.tagId}>
                        <Path
                          d={linePath}
                          fill="none"
                          stroke={item.color}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={isSelected ? 3.4 : 2.4}
                          opacity={isDimmed ? 0.24 : 0.92}
                        />
                        {lastPoint && !isDimmed && (
                          <Circle
                            cx={lastPoint.x}
                            cy={lastPoint.y}
                            r={isSelected ? 4.8 : 3.6}
                            fill={item.color}
                          />
                        )}
                      </G>
                    ) : null;
                  })}
                </Svg>
              </Animated.View>
            </View>

            <View style={[styles.axisLabels, { marginLeft: Y_AXIS_WIDTH, width: graphWidth }]}>
              {axisPoints.map((point, index) => {
                return (
                  <View
                    key={`${point.id}-${index}`}
                    style={[
                      styles.axisLabelSlot,
                      { width: `${100 / Math.max(axisPoints.length, 1)}%` },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.62}
                      style={[
                        styles.axisLabel,
                        {
                          color: colors.textSecondary,
                          fontSize: fontSizes.xs,
                        },
                      ]}
                    >
                      {point.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.legendRows}>
              {data.map((item) => (
                <TagLegendRow
                  key={item.tagId}
                  item={item}
                  isSelected={selectedTagId === item.tagId}
                  isDimmed={Boolean(selectedTagId && selectedTagId !== item.tagId)}
                  onPress={() => handlePressTag(item.tagId)}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </Squircle>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.1)",
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
  chartWrap: {
    height: CHART_HEIGHT,
    marginTop: 18,
    overflow: "hidden",
    position: "relative",
  },
  chartSvg: {
    position: "absolute",
    top: 0,
  },
  gridLayer: {
    bottom: 0,
    height: CHART_HEIGHT,
    justifyContent: "space-between",
    position: "absolute",
    right: 0,
    top: 0,
  },
  yAxis: {
    height: CHART_HEIGHT,
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    top: 0,
    width: Y_AXIS_WIDTH,
  },
  yAxisLabel: {
    fontFamily: "Satoshi-Bold",
    textAlign: "left",
  },
  gridLine: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.72,
    width: "100%",
  },
  axisLabels: {
    flexDirection: "row",
    height: 18,
    marginTop: 8,
  },
  axisLabelSlot: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  axisLabel: {
    fontFamily: "Satoshi-Medium",
    textAlign: "center",
    width: "100%",
  },
  legendRows: {
    gap: 6,
    marginTop: 14,
  },
  legendRow: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 8,
  },
  legendNameWrap: {
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
  state: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    minHeight: 180,
  },
  emptyText: {
    fontFamily: "Satoshi-Medium",
    textAlign: "center",
  },
});
