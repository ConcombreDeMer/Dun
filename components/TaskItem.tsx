import { Feather } from '@expo/vector-icons';
import * as Haptics from "expo-haptics";
import { SquircleButton } from 'expo-squircle-view';
import { useCallback, useEffect, useRef } from "react";
import { Alert, Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { Easing, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { toAppDateKey } from "../lib/date";
import { useFont } from "../lib/FontContext";
import { useAppTranslation } from "../lib/i18n";
import { useTheme } from "../lib/ThemeContext";
import { useOptimisticTaskMutations } from "../lib/useOptimisticTaskMutations";
import Squircle from "./Squircle";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const hexToRgb = (color: string) => {
  const normalized = color.replace('#', '');
  const hex = normalized.length === 3 || normalized.length === 4
    ? normalized
      .slice(0, 3)
      .split('')
      .map((value) => value + value)
      .join('')
    : normalized.slice(0, 6);

  if (hex.length !== 6) {
    return null;
  }

  const value = Number.parseInt(hex, 16);
  if (Number.isNaN(value)) {
    return null;
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const blendColors = (foreground: string, background: string, foregroundOpacity: number) => {
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);

  if (!foregroundRgb || !backgroundRgb) {
    return foreground;
  }

  const blendChannel = (foregroundChannel: number, backgroundChannel: number) =>
    Math.round(foregroundChannel * foregroundOpacity + backgroundChannel * (1 - foregroundOpacity));

  return `rgb(${blendChannel(foregroundRgb.r, backgroundRgb.r)}, ${blendChannel(foregroundRgb.g, backgroundRgb.g)}, ${blendChannel(foregroundRgb.b, backgroundRgb.b)})`;
};

export interface TaskItemLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TaskItemProps {
  item: {
    id: number;
    name: string;
    done: boolean;
    description: string;
    date?: string;
  };
  drag: () => void;
  isActive: boolean;
  handleToggleTask: (taskId: number, currentDone: boolean) => void;
  handleTaskPress: (taskId: number, layout?: TaskItemLayout) => void;
  selectedTaskId: number | null;
  listHeight: number;
  layoutAnimationKey?: string;
  disableAddedAnimations?: boolean;
  isExtendable?: boolean;
  isTogglePending?: boolean;
  mode?: 'normal' | 'daily';
}

export const TaskItem = ({
  item,
  drag,
  isActive,
  handleToggleTask,
  handleTaskPress,
  selectedTaskId,
  listHeight,
  layoutAnimationKey,
  disableAddedAnimations = false,
  isExtendable = true,
  isTogglePending = false,
  mode = 'normal',
}: TaskItemProps) => {
  const { actualTheme, colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const dotScale = useSharedValue(item.done ? 1 : 0);
  const rowOpacity = useSharedValue(1);
  const rowScale = useSharedValue(1);
  const rowTranslateY = useSharedValue(0);
  const layoutTranslateY = useSharedValue(0);
  const enterProgress = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const doneProgress = useSharedValue(item.done ? 1 : 0);

  const {
    deleteTaskOptimistically,
    isTaskDeletePending,
    isTaskMovePending,
    moveTaskDateOptimistically,
  } = useOptimisticTaskMutations();
  const swipeableRef = useRef<Swipeable>(null);
  const rowRef = useRef<View>(null);
  const lastMeasuredYRef = useRef<number | null>(null);
  const isActiveRef = useRef(isActive);
  const selectedTaskIdRef = useRef(selectedTaskId);
  const disableAddedAnimationsRef = useRef(disableAddedAnimations);

  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);
  const itemOpacity = useSharedValue(1);
  const isSelected = selectedTaskId === item.id;
  const isHidden = selectedTaskId !== null && !isSelected;
  const checkboxDoneBackground = actualTheme === 'dark' ? '#314539' : '#E3F4E9';
  const checkboxDoneBorder = actualTheme === 'dark' ? '#5A9B73' : '#74BE8C';
  const checkboxDoneIcon = actualTheme === 'dark' ? '#89BE9B' : '#4E9C68';
  const mutedTaskColor = blendColors(colors.task, colors.background, 0.5);
  const mutedTextColor = blendColors(colors.text, colors.background, 0.5);

  const handleDeleteAfterSwipe = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void deleteTaskOptimistically(item.id).catch((error: any) => {
      console.error("Erreur lors de la suppression:", error);
      Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
    });
  }, [deleteTaskOptimistically, item.id, t]);

  const handleSwipeLeft = useCallback(() => {
    if (isTaskDeletePending(item.id)) return;

    swipeableRef.current?.close();
    itemOpacity.value = withTiming(0, { duration: 600 }, (finished) => {
      if (finished) {
        runOnJS(handleDeleteAfterSwipe)();
      }
    });
    translateX.value = withTiming(-screenWidth, { duration: 600 });
  }, [handleDeleteAfterSwipe, isTaskDeletePending, item.id, translateX, itemOpacity, screenWidth]);

  const handleMoveAfterSwipe = useCallback(() => {
    const sourceDate = item.date ? new Date(item.date) : new Date();
    const targetDate = mode === 'daily' ? new Date() : sourceDate;

    if (mode !== 'daily') {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const nextDateKey = toAppDateKey(targetDate);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void moveTaskDateOptimistically(item.id, nextDateKey).catch((error: any) => {
      console.error("Erreur lors du report:", error);
      Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
    });
  }, [item.date, item.id, mode, moveTaskDateOptimistically, t]);

  const handleSwipeRight = useCallback(() => {
    if (isTaskMovePending(item.id)) return;

    const sourceDate = item.date ? new Date(item.date) : new Date();
    const targetDate = mode === 'daily' ? new Date() : new Date(sourceDate);

    if (mode !== 'daily') {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    if (toAppDateKey(sourceDate) === toAppDateKey(targetDate)) {
      swipeableRef.current?.close();
      translateX.value = withTiming(0, { duration: 180 });
      itemOpacity.value = withTiming(1, { duration: 180 });
      return;
    }

    swipeableRef.current?.close();
    itemOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(handleMoveAfterSwipe)();
      }
    });
    translateX.value = withTiming(screenWidth, { duration: 300 });
  }, [handleMoveAfterSwipe, isTaskMovePending, item.date, item.id, mode, translateX, itemOpacity, screenWidth]);

  const renderRightActions = useCallback(() => {
    return (
      <View style={{ width: 130, minHeight: 64, height: '100%', paddingLeft: 10, justifyContent: 'center' }}>
        <SquircleButton
          onPress={handleSwipeLeft}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#f5b7b9',
            flex: 1,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
          cornerSmoothing={100} // 0-100
          preserveSmoothing={true} // false matches figma, true has more roundingez
        >
          <Text style={{ fontFamily: 'Satoshi-Regular', color: '#c83232', fontSize: fontSizes.base }}>{t("task.deleteLabel")}</Text>
          <Feather name="trash-2" size={18} color="#c83232" />
        </SquircleButton>
      </View>
    );
  }, [handleSwipeLeft, fontSizes.base, t]);

  const renderLeftActions = useCallback(() => {
    const actionWidth = mode === 'daily' ? 170 : 120;
    const actionText = mode === 'daily' ? "Pour aujourd'hui" : "Reporter";

    return (
      <View style={{ width: actionWidth, minHeight: 64, height: '100%', paddingRight: 10, justifyContent: 'center' }}>
        <SquircleButton
          onPress={handleSwipeRight}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#333333',
            flex: 1,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
          cornerSmoothing={100} // 0-100
          preserveSmoothing={true} // false matches figma, true has more rounding
        >
          <Text style={{ fontFamily: 'Satoshi-Regular', color: '#ffffff', fontSize: fontSizes.base }}>{actionText}</Text>
          <Feather name={mode === 'daily' ? "corner-down-left" : "chevron-right"} size={20} color="#ffffff" />
        </SquircleButton>
      </View>
    );
  }, [handleSwipeRight, fontSizes.base, mode]);

  const animatedStyle = useAnimatedStyle(() => {
    const enterScale = disableAddedAnimations ? 1 : 0.3 + enterProgress.value * 0.7;
    const enterOpacity = disableAddedAnimations ? 1 : enterProgress.value;

    return {
      transform: [
        { scale: (isActive ? 1.02 : 1) * pressScale.value * rowScale.value * enterScale },
        { translateY: rowTranslateY.value + layoutTranslateY.value },
        { translateX: translateX.value }
      ],
      opacity: itemOpacity.value * rowOpacity.value * enterOpacity,
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: withTiming(isActive ? 0.2 : 0, { duration: 140 }),
      elevation: withTiming(isActive ? 4 : 0, { duration: 140 }),
    };
  });

  const checkboxAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        dotScale.value,
        [0, 1],
        [colors.checkbox, checkboxDoneBackground]
      ),
      borderColor: interpolateColor(
        dotScale.value,
        [0, 1],
        [colors.border, checkboxDoneBorder]
      ),
      transform: [
        {
          scale: 0.96 + dotScale.value * 0.04,
        },
      ],
    };
  });

  const taskDoneOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: doneProgress.value,
    };
  });

  const taskTextAnimatedStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        doneProgress.value,
        [0, 1],
        [colors.text, mutedTextColor]
      ),
    };
  });

  const checkAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: dotScale.value,
      transform: [
        {
          scale: 0.6 + dotScale.value * 0.4,
        },
      ],
    };
  });

  const handleCheckboxPress = useCallback(() => {
    if (isTogglePending) return;

    const nextDone = !item.done;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dotScale.value = withSpring(nextDone ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 0.7,
      overshootClamping: true,
    });
    doneProgress.value = withTiming(nextDone ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    handleToggleTask(item.id, item.done);
  }, [doneProgress, isTogglePending, item.id, item.done, handleToggleTask, dotScale]);

  const handlePress = useCallback(() => {
    if (!isExtendable) return;
    rowRef.current?.measureInWindow((x, y, width, height) => {
      handleTaskPress(item.id, { x, y, width, height });
    });
  }, [handleTaskPress, item.id, isExtendable]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.98, {
      damping: 20,
      mass: 0.8,
      stiffness: 280,
      overshootClamping: true,
    });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, {
      damping: 20,
      mass: 0.8,
      stiffness: 280,
      overshootClamping: true,
    });
  }, [pressScale]);

  const measureCurrentY = useCallback((onMeasure: (y: number) => void) => {
    requestAnimationFrame(() => {
      rowRef.current?.measureInWindow((_, y) => {
        onMeasure(y);
      });
    });
  }, []);

  const measureInitialLayout = useCallback(() => {
    if (lastMeasuredYRef.current !== null) {
      return;
    }

    measureCurrentY((y) => {
      lastMeasuredYRef.current = y;
    });
  }, [measureCurrentY]);

  const measureAndAnimateLayoutChange = useCallback(() => {
    measureCurrentY((y) => {
      const previousY = lastMeasuredYRef.current;
      lastMeasuredYRef.current = y;

      if (previousY === null || disableAddedAnimationsRef.current || isActiveRef.current || selectedTaskIdRef.current !== null) {
        return;
      }

      const yDelta = previousY - y;

      if (Math.abs(yDelta) < 1) {
        return;
      }

      layoutTranslateY.value = yDelta;
      layoutTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 220,
        mass: 0.75,
        overshootClamping: true,
      });
    });
  }, [layoutTranslateY, measureCurrentY]);

  useEffect(() => {
    isActiveRef.current = isActive;
    selectedTaskIdRef.current = selectedTaskId;
    disableAddedAnimationsRef.current = disableAddedAnimations;
  }, [disableAddedAnimations, isActive, selectedTaskId]);

  useEffect(() => {
    measureAndAnimateLayoutChange();
  }, [layoutAnimationKey, measureAndAnimateLayoutChange]);

  useEffect(() => {
    if (disableAddedAnimations) {
      enterProgress.value = 1;
      layoutTranslateY.value = 0;
    }
  }, [disableAddedAnimations, enterProgress, layoutTranslateY]);

  useEffect(() => {
    if (isActive) {
      layoutTranslateY.value = 0;
    }
  }, [isActive, layoutTranslateY]);

  const taskItemStyle =
    [styles.taskItem, { backgroundColor: colors.task }];

  useEffect(() => {
    if (disableAddedAnimations) {
      enterProgress.value = 1;
      return;
    }

    enterProgress.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.quad),
    });
  }, [disableAddedAnimations, enterProgress]);

  useEffect(() => {
    dotScale.value = withSpring(item.done ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 0.7,
      overshootClamping: true,
    });
  }, [item.done, dotScale]);

  useEffect(() => {
    doneProgress.value = withTiming(item.done ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [doneProgress, item.done]);

  useEffect(() => {
    rowOpacity.value = withTiming(selectedTaskId === null ? 1 : isSelected ? 0 : 0, {
      duration: 220,
      easing: Easing.out(Easing.quad),
    });
    rowScale.value = withTiming(selectedTaskId === null ? 1 : isHidden ? 0.98 : 1, {
      duration: 260,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });
    rowTranslateY.value = withTiming(selectedTaskId === null ? 0 : isHidden ? 8 : 0, {
      duration: 260,
      easing: Easing.out(Easing.quad),
    });
  }, [isHidden, isSelected, listHeight, rowOpacity, rowScale, rowTranslateY, selectedTaskId]);

  return (
    <Animated.View ref={rowRef} onLayout={measureInitialLayout} style={[animatedStyle, shadowStyle]}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        enabled={selectedTaskId === null}
        leftThreshold={40}
        rightThreshold={40}
        friction={1.05}
        overshootRight={false}
        overshootLeft={false}
        containerStyle={{ overflow: 'visible' }}
      >
        <Squircle style={taskItemStyle}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.taskDoneOverlay,
              { backgroundColor: mutedTaskColor },
              taskDoneOverlayStyle,
            ]}
          />
          <Pressable
            onLongPress={drag}
            disabled={isActive || selectedTaskId !== null}
            delayLongPress={500}
            style={{
              width: "100%",
              minHeight: 64,
            }}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.taskContent}>
              <Animated.Text style={[
                styles.taskName,
                taskTextAnimatedStyle,
                { fontSize: fontSizes.lg }
              ]}>
                {item.name}
              </Animated.Text>

              <View style={styles.checkboxContainer}>
                <AnimatedTouchableOpacity
                  style={[
                    styles.taskCheckbox,
                    checkboxAnimatedStyle,
                  ]}
                  onPress={handleCheckboxPress}
                  disabled={isTogglePending}
                  activeOpacity={0.85}
                >
                  <Animated.View style={checkAnimatedStyle}>
                    <Feather name="check" size={21} color={checkboxDoneIcon} strokeWidth={3.2} />
                  </Animated.View>
                </AnimatedTouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Squircle>
      </Swipeable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    position: 'relative',
    justifyContent: 'space-between',
    borderRadius: 20,
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.15)',
  },

  taskDoneOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  taskItemDone: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
    borderRadius: 20,
    width: '90%',
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    backgroundColor: '#475c48ff',
  },

  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 64,
  },

  taskName: {
    flex: 1,
    flexShrink: 1,
    fontFamily: 'Satoshi-Regular',
    zIndex: 1,
    marginLeft: 10,
    marginRight: 10,
  },

  taskNameDone: {
    flex: 1,
    flexShrink: 1,
    fontFamily: 'Satoshi-Regular',
    zIndex: 1,
    marginLeft: 10,
    marginRight: 10,
    opacity: 0.6,
  },

  taskCheckbox: {
    width: 38,
    height: 38,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxContainer: {
    position: 'relative',
    width: 45,
    height: 45,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  taskCheckboxDone: {
  },
});
