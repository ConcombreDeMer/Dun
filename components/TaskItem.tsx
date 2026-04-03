import { Feather } from '@expo/vector-icons';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { SquircleButton } from 'expo-squircle-view';
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from 'react-native-gesture-handler';
import { FadeIn, default as ReAnimated, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useFont } from "../lib/FontContext";
import { useAppTranslation } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";
import PopUpTask from "./popUpTask";
import Squircle from "./Squircle";

interface TaskItemProps {
  item: {
    id: number;
    name: string;
    done: boolean;
    description: string;
  };
  drag: () => void;
  isActive: boolean;
  handleToggleTask: (taskId: number, currentDone: boolean) => void;
  handleTaskPress: (taskId: number) => void;
  selectedTaskId: number | null;
  listHeight: number;
  isExtendable?: boolean;
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
  isExtendable = true,
  mode = 'normal',
}: TaskItemProps) => {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const [isDisplayNone, setIsDisplayNone] = useState(false);
  const dotScale = useSharedValue(item.done ? 100 : 1);
  const isExpanded = useSharedValue(item.done);
  const height = useSharedValue(64);
  const pressScale = useSharedValue(1);
  const isHeightExpandedRef = { current: false };
  const [isOpen, setIsOpen] = useState(false);

  const queryClient = useQueryClient();
  const swipeableRef = useRef<Swipeable>(null);

  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);
  const itemOpacity = useSharedValue(1);

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      // Récupérer la tâche AVANT la suppression
      const { data: taskData, error: fetchError } = await supabase
        .from("Tasks")
        .select("date, done")
        .eq("id", item.id)
        .single();
      if (fetchError || !taskData) throw new Error(fetchError?.message || "Tâche non trouvée");

      const taskDate = new Date(taskData.date).toDateString();
      const isDone = taskData.done;

      // Supprimer la tâche
      const { error: deleteError } = await supabase
        .from("Tasks")
        .delete()
        .eq("id", item.id);
      if (deleteError) throw new Error(deleteError.message);

      // Mettre à jour la table Days
      const { data: existingDay, error: fetchDayError } = await supabase
        .from("Days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", taskDate)
        .maybeSingle();

      if (existingDay) {
        const newTotal = Math.max((existingDay.total || 1) - 1, 0);
        const newDoneCount = isDone
          ? Math.max((existingDay.done_count || 1) - 1, 0)
          : (existingDay.done_count || 0);

        if (newTotal === 0) {
          await supabase.from("Days").delete().eq("id", existingDay.id);
        } else {
          await supabase
            .from("Days")
            .update({
              total: newTotal,
              done_count: newDoneCount,
              updated_at: new Date().toDateString(),
            })
            .eq("id", existingDay.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["days"] });
    }
  });

  const postponeTaskMutation = useMutation({
    mutationFn: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const { data: taskData, error: fetchError } = await supabase
        .from("Tasks")
        .select("date, done")
        .eq("id", item.id)
        .single();

      if (fetchError || !taskData) throw new Error(fetchError?.message || "Tâche non trouvée");

      const oldDate = new Date(taskData.date);
      const oldDateString = oldDate.toDateString();
      const isDone = taskData.done;

      let currentDate = new Date(taskData.date);
      if (mode === 'daily') {
        currentDate = new Date();
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      const newDateString = currentDate.toDateString();
      
      if (oldDateString === newDateString) return;

      // Update Task date
      const { error } = await supabase
        .from("Tasks")
        .update({ date: newDateString })
        .eq("id", item.id);
      if (error) throw new Error(error.message);

      // Retirer la tâche de l'ancien jour
      const { data: oldDay } = await supabase
        .from("Days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", oldDateString)
        .maybeSingle();

      if (oldDay) {
        const newTotal = Math.max((oldDay.total || 1) - 1, 0);
        const newDoneCount = isDone
          ? Math.max((oldDay.done_count || 1) - 1, 0)
          : (oldDay.done_count || 0);

        if (newTotal === 0) {
          await supabase.from("Days").delete().eq("id", oldDay.id);
        } else {
          await supabase.from("Days").update({
            total: newTotal,
            done_count: newDoneCount,
            updated_at: new Date().toDateString(),
          }).eq("id", oldDay.id);
        }
      }

      // Ajouter la tâche au nouveau jour
      const { data: newDay } = await supabase
        .from("Days")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", newDateString)
        .maybeSingle();

      if (!newDay) {
        await supabase.from("Days").insert([{
          user_id: user.id,
          date: newDateString,
          total: 1,
          done_count: isDone ? 1 : 0,
          updated_at: new Date().toDateString(),
        }]);
      } else {
        await supabase.from("Days").update({
          total: (newDay.total || 0) + 1,
          done_count: isDone ? (newDay.done_count || 0) + 1 : (newDay.done_count || 0),
          updated_at: new Date().toDateString(),
        }).eq("id", newDay.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["days"] });
    }
  });

  const handleSwipeLeft = useCallback(() => {
    swipeableRef.current?.close();
    itemOpacity.value = withTiming(0, { duration: 600 });
    translateX.value = withTiming(-screenWidth, { duration: 1000 }, (finished) => {
      if (finished) runOnJS(deleteTaskMutation.mutate)();
    });
  }, [deleteTaskMutation, translateX, itemOpacity, screenWidth]);

  const handleSwipeRight = useCallback(() => {
    swipeableRef.current?.close();
    translateX.value = withTiming(screenWidth, { duration: 300 }, (finished) => {
      if (finished) runOnJS(postponeTaskMutation.mutate)();
    });
  }, [postponeTaskMutation, translateX, screenWidth]);

  const renderRightActions = useCallback(() => {
    return (
      <View style={{ width: 130, height: 64, paddingLeft: 10, justifyContent: 'center' }}>
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
  }, [handleSwipeLeft, fontSizes.base]);

  const renderLeftActions = useCallback(() => {
    const actionWidth = mode === 'daily' ? 170 : 120;
    const actionText = mode === 'daily' ? "Pour aujourd'hui" : "Reporter";

    return (
      <View style={{ width: actionWidth, height: 64, paddingRight: 10, justifyContent: 'center' }}>
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

  const animateHeight = (toValue: number) => {
    isHeightExpandedRef.current = toValue === 400;
    height.value = withSpring(toValue);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: (isActive ? 1.02 : 1) * pressScale.value },
        { translateX: translateX.value }
      ],
      opacity: itemOpacity.value * (isActive ? 1 : 1),
    };
  });

  const heightAnimatedStyle = useAnimatedStyle(() => {
    const isHidden = selectedTaskId !== null && selectedTaskId !== item.id;
    return {
      height: withSpring(height.value, {
        stiffness: 250,      // Plus élevé = animation plus rapide
        damping: 14,         // Augmenté pour réduire le bounce
        mass: 1,
        overshootClamping: false,  // Autorise le bounce
        energyThreshold: 6e-9,
        velocity: 5,
      }),
      marginBottom: withSpring(isHidden ? 0 : 10),
      // borderWidth: withSpring(isHidden ? 0 : 0.5),
      opacity: withSpring(isHidden ? 0 : 1),
      display: isDisplayNone ? 'none' : 'flex',

    } as any;
  }, [height, selectedTaskId, item.id, isDisplayNone]);

  const shadowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: withSpring(isActive ? 0.3 : 0),
      elevation: withSpring(isActive ? 5 : 0),
    };
  });

  const dotAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(20 * dotScale.value),
      height: withSpring(20 * dotScale.value),
      borderRadius: withSpring(20 * dotScale.value),
    };
  });

  const handleCheckboxPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isExpanded.value) {
      dotScale.value = withSpring(1);
      isExpanded.value = false;
    } else {
      dotScale.value = withSpring(100);
      isExpanded.value = true;
    }

    handleToggleTask(item.id, item.done);
  }, [item.id, item.done, handleToggleTask, dotScale, isExpanded]);

  const handlePress = useCallback(() => {
    if (!isExtendable) return;
    console.log("Task pressed:", item.id);
    setIsOpen(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isActive) {
      animateHeight(isHeightExpandedRef.current ? 64 : 400);
      handleTaskPress(item.id);
    }
  }, [isActive, item.id, handleTaskPress, isExtendable]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.98, {
      damping: 15,
      mass: 1,
      stiffness: 300,
    });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, {
      damping: 15,
      mass: 1,
      stiffness: 300,
    });
  }, [pressScale]);

  const taskItemStyle =
    [styles.taskItem, { backgroundColor: colors.task }];

  useEffect(() => {
    if (item.done) {
      dotScale.value = 100;
      isExpanded.value = true;
    } else {
      dotScale.value = 1;
      isExpanded.value = false;
    }
  }, [item.done, dotScale, isExpanded]);

  useEffect(() => {
    const isHidden = selectedTaskId !== null && selectedTaskId !== item.id;
    if (isHidden) {
      // Appliquer display:none après 500ms
      const timeout = setTimeout(() => {
        setIsDisplayNone(true);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      // Retirer display:none immédiatement pour la réapparition
      setIsDisplayNone(false);
    }
  }, [selectedTaskId, item.id]);

  useEffect(() => {
    if (selectedTaskId === item.id) {
      // Cette tâche est sélectionnée, l'agrandir avec la hauteur de la liste
      animateHeight(listHeight * 0.8);
    } else if (selectedTaskId !== null) {
      // Une autre tâche est sélectionnée, la faire disparaître
      animateHeight(0);
    } else {
      // Aucune tâche sélectionnée, retour à la taille normale
      animateHeight(64);
    }
  }, [selectedTaskId, item.id, listHeight]);

  return (
    <ReAnimated.View style={[animatedStyle, shadowStyle]}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        enabled={!isOpen}
        leftThreshold={40}
        rightThreshold={40}
        friction={2}
        overshootRight={false}
        overshootLeft={false}
        containerStyle={{ overflow: 'visible' }}
      >
        <Squircle style={[taskItemStyle, heightAnimatedStyle]}>
          <Pressable
            onLongPress={drag}
            disabled={isActive}
            delayLongPress={500}
            style={{
              width: "100%",
              height: "100%",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.taskContent}>

              {
                !isOpen &&

                <ReAnimated.View
                  entering={FadeIn.springify().delay(400)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={[
                    item.done ? styles.taskNameDone : styles.taskName,
                    { color: item.done ? colors.textDone : colors.text, fontSize: fontSizes.lg }
                  ]}>
                    {item.name}
                  </Text>

                  <View style={styles.checkboxContainer}>
                    <ReAnimated.View style={[styles.checkboxDot, dotAnimatedStyle, { backgroundColor: colors.taskDone }]} />
                    <TouchableOpacity
                      style={[
                        styles.taskCheckbox,
                        item.done && { backgroundColor: colors.checkboxDone },
                        !item.done && { backgroundColor: colors.checkbox }
                      ]}
                      onPress={handleCheckboxPress}
                      activeOpacity={0.7}
                    >
                      {item.done && <Text style={[styles.checkmark, { color: colors.checkMark }]}>✓</Text>}
                    </TouchableOpacity>
                  </View>

                </ReAnimated.View>
              }


              {
                isOpen &&

                <PopUpTask
                  onClose={() => handlePress()}
                  id={item.id}
                />


                // <Animated.Text
                //   entering={FadeInUp.springify().delay(300)}
                //   exiting={FadeOut.springify()}
                //   style={{ 
                //     marginTop: 200,
                //     color: colors.textSecondary,
                //     fontSize: fontSizes.base,
                //    }}
                // >
                //   {item.description}
                // </Animated.Text>
              }
            </View>
          </Pressable>
        </Squircle>
      </Swipeable>
    </ReAnimated.View>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 12,
    // marginBottom: 10,
    justifyContent: 'space-between',
    borderRadius: 20,
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.15)',
  },

  taskItemDone: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
    borderRadius: 20,
    width: '90%',
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    backgroundColor: '#475c48ff',
    // boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.2)',
  },

  taskContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  taskName: {
    fontFamily: 'Satoshi-Regular',
    zIndex: 1,
    marginLeft: 10,
  },

  taskNameDone: {
    fontFamily: 'Satoshi-Regular',
    zIndex: 1,
    marginLeft: 10,
    opacity: 0.6,
  },

  taskCheckbox: {
    width: 45,
    height: 45,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxContainer: {
    position: 'relative',
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 10,
    zIndex: 0,
  },

  taskCheckboxDone: {
  },

  checkmark: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
});
