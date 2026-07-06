import CreateModalHost from "@/components/CreateModalHost";
import PopUpTask from "@/components/popUpTask";
import Squircle from "@/components/Squircle";
import { TaskItem, TaskItemLayout } from "@/components/TaskItem";
import { useAppTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useToggleTaskDone } from "@/lib/useToggleTaskDone";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReAnimated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const getTaskRenderKey = (task: any) => task.clientKey ?? task.id;

const getTasks = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("Tasks")
    .select("id, name, description, done, order, date, created_at, completed_at, resolved_at, resolution, carried_from_id, delay_count, late_adjusted_at, Task_Tags(tag_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors de la récupération des tâches:", error);
    return [];
  }

  return data ?? [];
};

export default function Box() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { colors, theme } = useTheme();
  const { t } = useAppTranslation();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskLayout, setSelectedTaskLayout] = useState<TaskItemLayout | null>(null);
  const [shouldRenderOverlayContent, setShouldRenderOverlayContent] = useState(false);
  const overlayProgress = useSharedValue(0);
  const taskToggleQueryKeys = useMemo(() => [["tasks"]], []);
  const { isTaskPending, toggleTaskDone } = useToggleTaskDone({
    queryKeys: taskToggleQueryKeys,
    errorTitle: t("common.alerts.errorTitle"),
    errorMessage: t("common.alerts.genericError"),
  });

  const taskQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 60 * 15,
  });

  const boxTasks = useMemo(() => {
    return (taskQuery.data ?? [])
      .filter((task: any) => !task.date && !task.resolved_at)
      .sort((a: any, b: any) => {
        const left = a.created_at ? new Date(a.created_at).getTime() : 0;
        const right = b.created_at ? new Date(b.created_at).getTime() : 0;
        return right - left;
      });
  }, [taskQuery.data]);

  const selectedTask = useMemo(
    () => boxTasks.find((task: any) => task.id === selectedTaskId) ?? null,
    [boxTasks, selectedTaskId]
  );

  const handleToggleTask = useCallback((taskId: number, currentDone: boolean) => {
    void toggleTaskDone(taskId, currentDone);
  }, [toggleTaskDone]);

  const closeSelectedTaskOverlay = useCallback((afterClose?: () => void) => {
    setShouldRenderOverlayContent(false);
    overlayProgress.value = withTiming(0, {
      duration: 260,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    }, (finished) => {
      if (finished) {
        runOnJS(setSelectedTaskId)(null);
        runOnJS(setSelectedTaskLayout)(null);
        if (afterClose) {
          runOnJS(afterClose)();
        }
      }
    });
  }, [overlayProgress]);

  const handleTaskPress = useCallback((taskId: number, layout?: TaskItemLayout) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedTaskId === taskId) {
      closeSelectedTaskOverlay();
      return;
    }

    if (!layout) return;

    setShouldRenderOverlayContent(false);
    setSelectedTaskLayout(layout);
    setSelectedTaskId(taskId);
    overlayProgress.value = 0;

    requestAnimationFrame(() => {
      overlayProgress.value = withTiming(1, {
        duration: 560,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      });
    });
  }, [closeSelectedTaskOverlay, overlayProgress, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId === null || selectedTaskLayout === null) return;

    const timeout = setTimeout(() => {
      setShouldRenderOverlayContent(true);
    }, 280);

    return () => clearTimeout(timeout);
  }, [selectedTaskId, selectedTaskLayout]);

  const listAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selectedTaskId !== null ? 0.35 : 1, {
      duration: selectedTaskId !== null ? 220 : 280,
      easing: Easing.out(Easing.quad),
    }),
  }), [selectedTaskId]);

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    if (!selectedTaskLayout) {
      return { opacity: 0 };
    }

    const finalLeft = 16;
    const finalTop = 70;
    const finalWidth = windowWidth - 32;
    const finalHeight = Math.max(320, windowHeight - finalTop - 110);

    return {
      position: "absolute",
      left: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.x, finalLeft]),
      top: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.y, finalTop]),
      width: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.width, finalWidth]),
      height: interpolate(overlayProgress.value, [0, 1], [selectedTaskLayout.height, finalHeight]),
      borderRadius: interpolate(overlayProgress.value, [0, 1], [20, 30]),
      opacity: overlayProgress.value,
    };
  }, [selectedTaskLayout, windowHeight, windowWidth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme === "dark" ? "light" : "auto"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text, opacity: 0.8 }]}>{t("box.title")}</Text>
          {/* <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("box.subtitle")}</Text> */}
        </View>

        <ReAnimated.View style={[styles.listContainer, listAnimatedStyle]}>
          {taskQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : (
            <FlatList
              data={boxTasks}
              keyExtractor={(item) => `box-${getTaskRenderKey(item)}`}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={false}
              contentContainerStyle={styles.flatListContent}
              renderItem={({ item }) => (
                <TaskItem
                  item={item}
                  drag={() => { }}
                  isActive={false}
                  handleToggleTask={handleToggleTask}
                  handleTaskPress={handleTaskPress}
                  isTogglePending={isTaskPending(item.id)}
                  selectedTaskId={selectedTaskId}
                  listHeight={0}
                  layoutAnimationKey={boxTasks.map(getTaskRenderKey).join(":")}
                  mode="box"
                />
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t("box.emptyState")}
                </Text>
              }
            />
          )}
        </ReAnimated.View>

        {selectedTask && selectedTaskLayout ? (
          <ReAnimated.View pointerEvents="box-none" style={styles.overlayRoot}>
            <Squircle
              style={[
                styles.overlayCard,
                { backgroundColor: colors.task, borderRadius: 10 },
                overlayAnimatedStyle,
              ]}
              cornerSmoothing={100}
              preserveSmoothing={true}
            >
              <View style={styles.overlayContent}>
                {shouldRenderOverlayContent ? (
                  <PopUpTask
                    id={selectedTask.id}
                    onClose={closeSelectedTaskOverlay}
                  />
                ) : null}
              </View>
            </Squircle>
          </ReAnimated.View>
        ) : null}

        <CreateModalHost activePath="/box" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    gap: 4,
    paddingBottom: 18,
    paddingHorizontal: 22,
  },
  title: {
    fontFamily: "Satoshi-Bold",
    fontSize: 34,
  },
  subtitle: {
    fontFamily: "Satoshi-Regular",
    fontSize: 15,
  },
  listContainer: {
    flex: 1,
  },
  flatListContent: {
    gap: 8,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: "Satoshi-Regular",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  overlayRoot: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "box-none",
    zIndex: 20,
  },
  overlayCard: {
    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.12)",
    overflow: "hidden",
  },
  overlayContent: {
    flex: 1,
  },
});
