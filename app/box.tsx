import CreateModalHost from "@/components/CreateModalHost";
import PopUpTask from "@/components/popUpTask";
import PremiumCTAButton from "@/components/PremiumCTAButton";
import SecondaryButton from "@/components/secondaryButton";
import Squircle from "@/components/Squircle";
import { TaskItem, TaskItemLayout } from "@/components/TaskItem";
import { useAuthUserId } from "@/lib/AuthSessionContext";
import { toAppDateKey } from "@/lib/date";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { SCREEN_HEADER_HEIGHT, SCREEN_HEADER_HORIZONTAL_PADDING, SCREEN_HEADER_TITLE_LINE_HEIGHT } from "@/lib/screenHeader";
import { useSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { fetchTaskList, type TaskListItem } from "@/lib/tasks";
import { useTheme } from "@/lib/ThemeContext";
import { useToggleTaskDone } from "@/lib/useToggleTaskDone";
import { useStore } from "@/store/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReAnimated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const getTaskRenderKey = (task: any) => task.clientKey ?? task.id;

export default function Box() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const { fontSizes } = useFont();
  const { colors, theme } = useTheme();
  const { t } = useAppTranslation();
  const { canUseTaskBox } = useSubscription();
  const storedDate = useStore((state) => state.selectedDate);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskLayout, setSelectedTaskLayout] = useState<TaskItemLayout | null>(null);
  const [shouldRenderOverlayContent, setShouldRenderOverlayContent] = useState(false);
  const [optimisticTaskOrder, setOptimisticTaskOrder] = useState<(string | number)[] | null>(null);
  const [disableCustomListAnimations, setDisableCustomListAnimations] = useState(false);
  const reorderAnimationUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayProgress = useSharedValue(0);
  const queryClient = useQueryClient();
  const userId = useAuthUserId();
  const tasksQueryKey = useMemo(() => ["tasks", userId] as const, [userId]);
  const taskToggleQueryKeys = useMemo(() => [tasksQueryKey], [tasksQueryKey]);
  const { isTaskPending, toggleTaskDone } = useToggleTaskDone({
    queryKeys: taskToggleQueryKeys,
    errorTitle: t("common.alerts.errorTitle"),
    errorMessage: t("common.alerts.genericError"),
  });

  const taskQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => fetchTaskList(queryClient.getQueryData<TaskListItem[]>(tasksQueryKey) ?? [], userId),
    enabled: !!userId,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 60 * 15,
  });

  const boxTasks = useMemo(() => {
    return (taskQuery.data ?? [])
      .filter((task: any) => !task.date && !task.resolved_at)
      .sort((a: any, b: any) => {
        const orderDelta = (b.order || 0) - (a.order || 0);
        if (orderDelta !== 0) return orderDelta;
        return b.id - a.id;
      });
  }, [taskQuery.data]);

  const displayedBoxTasks = useMemo(() => {
    if (!optimisticTaskOrder || optimisticTaskOrder.length !== boxTasks.length) {
      return boxTasks;
    }

    const tasksById = new Map(boxTasks.map((task: any) => [getTaskRenderKey(task), task]));
    const nextTasks = optimisticTaskOrder
      .map((taskKey) => tasksById.get(taskKey))
      .filter(Boolean);

    return nextTasks.length === boxTasks.length ? nextTasks : boxTasks;
  }, [boxTasks, optimisticTaskOrder]);

  const taskListCompositionKey = useMemo(
    () => displayedBoxTasks.map(getTaskRenderKey).join(":"),
    [displayedBoxTasks]
  );

  const selectedDateKey = useMemo(
    () => toAppDateKey(storedDate ?? new Date()),
    [storedDate]
  );

  const selectedTask = useMemo(
    () => boxTasks.find((task: any) => task.id === selectedTaskId) ?? null,
    [boxTasks, selectedTaskId]
  );
  const canRecoverExistingBoxTasks = !canUseTaskBox && boxTasks.length > 0;
  const shouldShowBoxTasks = canUseTaskBox || canRecoverExistingBoxTasks;

  const handleBackPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleToggleTask = useCallback((taskId: number, currentDone: boolean) => {
    void toggleTaskDone(taskId, currentDone);
  }, [toggleTaskDone]);

  const unlockCustomListAnimationsSoon = useCallback(() => {
    if (reorderAnimationUnlockTimeoutRef.current) {
      clearTimeout(reorderAnimationUnlockTimeoutRef.current);
    }

    reorderAnimationUnlockTimeoutRef.current = setTimeout(() => {
      setOptimisticTaskOrder(null);
      setDisableCustomListAnimations(false);
      reorderAnimationUnlockTimeoutRef.current = null;
    }, 700);
  }, []);

  const handleDragBegin = useCallback(() => {
    if (reorderAnimationUnlockTimeoutRef.current) {
      clearTimeout(reorderAnimationUnlockTimeoutRef.current);
      reorderAnimationUnlockTimeoutRef.current = null;
    }

    setDisableCustomListAnimations(true);
  }, []);

  const handlePlaceholderIndexChange = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDragEnd = useCallback(async ({ data }: { data: any[] }) => {
    if (!canUseTaskBox) {
      return;
    }

    const updatedData = data.map((task, index) => ({
      ...task,
      order: data.length - index,
    }));
    const previousTasks = queryClient.getQueryData<any[]>(tasksQueryKey);

    setOptimisticTaskOrder(updatedData.map(getTaskRenderKey));
    unlockCustomListAnimationsSoon();

    await queryClient.cancelQueries({ queryKey: tasksQueryKey });

    queryClient.setQueryData<any[]>(tasksQueryKey, (oldTasks) => {
      if (!oldTasks) return [];
      const otherTasks = oldTasks.filter((task: any) => task.date || task.resolved_at);
      return [...otherTasks, ...updatedData];
    });

    try {
      for (const task of updatedData) {
        const { error } = await supabase
          .from("Tasks")
          .update({ order: task.order })
          .eq("id", task.id)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'ordre de la box:", error);
      if (previousTasks) {
        queryClient.setQueryData(tasksQueryKey, previousTasks);
      } else {
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      }
    }
  }, [canUseTaskBox, queryClient, tasksQueryKey, unlockCustomListAnimationsSoon, userId]);

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
    return () => {
      if (reorderAnimationUnlockTimeoutRef.current) {
        clearTimeout(reorderAnimationUnlockTimeoutRef.current);
      }
    };
  }, []);

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
        {/* <View style={[styles.handler]} /> */}
        <View style={styles.backButton}>
          <SecondaryButton
            image="chevron.right"
            imageSize={24}
            onPress={handleBackPress}
          />
        </View>
        <View style={styles.header}>
          {/* <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["3xl"] }]}>{t("box.title")}</Text> */}
          <SymbolView name="archivebox.fill" size={48} tintColor={colors.textSecondary} style={{ alignSelf: 'center', marginBottom: 20, marginTop: 60 }} />
        </View>

        {taskQuery.isLoading && !canUseTaskBox ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : shouldShowBoxTasks ? (
          <ReAnimated.View style={[styles.listContainer, listAnimatedStyle]}>
            {taskQuery.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.text} />
              </View>
            ) : (
              <DraggableFlatList
                data={displayedBoxTasks}
                keyExtractor={(item) => `box-${getTaskRenderKey(item)}`}
                scrollEnabled={selectedTaskId === null}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                persistentScrollbar
                removeClippedSubviews={false}
                contentContainerStyle={styles.flatListContent}
                activationDistance={20}
                onDragBegin={handleDragBegin}
                onDragEnd={handleDragEnd}
                onPlaceholderIndexChange={handlePlaceholderIndexChange}
                renderItem={({ item, drag, isActive }) => (
                  <TaskItem
                    item={item}
                    drag={canUseTaskBox && displayedBoxTasks.length > 1 ? drag : () => { }}
                    isActive={isActive}
                    handleToggleTask={handleToggleTask}
                    handleTaskPress={handleTaskPress}
                    isTogglePending={isTaskPending(item.id)}
                    selectedTaskId={selectedTaskId}
                    listHeight={0}
                    layoutAnimationKey={taskListCompositionKey}
                    disableAddedAnimations={disableCustomListAnimations}
                    mode="box"
                    moveToDateKey={selectedDateKey}
                  />
                )}
                ListHeaderComponent={
                  canRecoverExistingBoxTasks ? (
                    <Squircle
                      style={[styles.recoveryNotice, { backgroundColor: colors.card, borderColor: "#F4BA00" }]}
                      cornerSmoothing={100}
                      preserveSmoothing={true}
                    >
                      <View style={styles.recoveryNoticeIcon}>
                        <SymbolView name="archivebox.fill" size={22} tintColor="#2C2405" />
                      </View>
                      <View style={styles.recoveryNoticeText}>
                        <Text style={[styles.recoveryNoticeTitle, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
                          {t("box.recovery.title")}
                        </Text>
                        <Text style={[styles.recoveryNoticeMessage, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                          {t("box.recovery.message")}
                        </Text>
                      </View>
                      <PremiumCTAButton
                        title={t("common.actions.unlock")}
                        onPress={() => router.push("/settings/premium")}
                      />
                    </Squircle>
                  ) : null
                }
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {t("box.emptyState")}
                  </Text>
                }
              />
            )}
          </ReAnimated.View>
        ) : (
          <View style={styles.premiumContainer}>
            <Squircle
              style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: "#F4BA00" }]}
              cornerSmoothing={100}
              preserveSmoothing={true}
            >
              <View style={styles.premiumIcon}>
                <SymbolView name="archivebox.fill" size={24} tintColor="#2C2405" />
              </View>
              <Text style={[styles.premiumTitle, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
                {t("box.premium.title")}
              </Text>
              <Text style={[styles.premiumMessage, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
                {t("box.premium.message")}
              </Text>
              <View style={[styles.premiumScreenshotSlot, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Image
                  source={theme === "dark"
                    ? require("@/assets/images/box/dark.png")
                    : require("@/assets/images/box/light.png")}
                  style={styles.premiumScreenshotImage}
                  resizeMode="contain"
                />
              </View>
              <PremiumCTAButton
                title={t("box.premium.cta")}
                onPress={() => router.push("/settings/premium")}
              />
            </Squircle>
          </View>
        )}

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

        {canUseTaskBox ? (
          <CreateModalHost activePath="/box" />
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    top: 80,
    width: 44,
    zIndex: 12,
  },
  handler: {
    width: 40,
    height: 5,
    borderRadius: 3,
    position: 'absolute',
    top: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignSelf: 'center',
  },
  header: {
    justifyContent: "center",
    gap: 4,
    marginBottom: 8,
    minHeight: SCREEN_HEADER_HEIGHT,
    paddingHorizontal: SCREEN_HEADER_HORIZONTAL_PADDING,
  },
  title: {
    fontFamily: "Satoshi-Bold",
    lineHeight: SCREEN_HEADER_TITLE_LINE_HEIGHT,
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
  recoveryNotice: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  recoveryNoticeIcon: {
    alignItems: "center",
    backgroundColor: "#F4BA00",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  recoveryNoticeText: {
    alignItems: "center",
    gap: 4,
  },
  recoveryNoticeTitle: {
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },
  recoveryNoticeMessage: {
    fontFamily: "Satoshi-Regular",
    lineHeight: 22,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  premiumContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  premiumCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  premiumIcon: {
    alignItems: "center",
    backgroundColor: "#F4BA00",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  premiumTitle: {
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },
  premiumMessage: {
    fontFamily: "Satoshi-Regular",
    lineHeight: 22,
    textAlign: "center",
  },
  premiumScreenshotSlot: {
    alignItems: "center",
    aspectRatio: 2.35,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 4,
    overflow: "hidden",
    width: "100%",
  },
  premiumScreenshotImage: {
    height: "100%",
    width: "100%",
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
