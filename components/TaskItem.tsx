import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { default as Animated, FadeInUp, FadeOut, default as ReAnimated, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useFont } from "../lib/FontContext";
import { useTheme } from "../lib/ThemeContext";
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
}

export const TaskItem = ({
  item,
  drag,
  isActive,
  handleToggleTask,
  handleTaskPress,
  selectedTaskId,
  listHeight,
}: TaskItemProps) => {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const [isDisplayNone, setIsDisplayNone] = useState(false);
  const dotScale = useSharedValue(item.done ? 100 : 1);
  const isExpanded = useSharedValue(item.done);
  const height = useSharedValue(64);
  const pressScale = useSharedValue(1);
  const isHeightExpandedRef = { current: false };
  const [isOpen , setIsOpen] = useState(false);

  const animateHeight = (toValue: number) => {
    isHeightExpandedRef.current = toValue === 400;
    height.value = withSpring(toValue);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: (isActive ? 1.02 : 1) * pressScale.value },
      ],
      opacity: withSpring(isActive ? 1 : 1),
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
      marginBottom: withSpring(isHidden ? 0 : 10 ),
      borderWidth: withSpring(isHidden ? 0 : 0.5),
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
    console.log("Task pressed:", item.id);
    setIsOpen(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isActive) {
      animateHeight(isHeightExpandedRef.current ? 64 : 400);
      handleTaskPress(item.id);
    }
  }, [isActive, item.id, handleTaskPress]);

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
      animateHeight(listHeight*0.8);
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
      <ReAnimated.View style={[taskItemStyle, heightAnimatedStyle]}>
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
            <Text style={[
              item.done ? styles.taskNameDone : styles.taskName,
              { color: item.done ? colors.textDone : colors.text, fontSize: fontSizes.lg }
            ]}>
              {item.name}
            </Text>

           {
            isOpen &&

            <Animated.Text
              entering={FadeInUp.springify().delay(300)}
              exiting={FadeOut.springify()}
              style={{ 
                marginTop: 200,
                color: colors.textSecondary,
                fontSize: fontSizes.base,
               }}
            >
              {item.description}
            </Animated.Text>
           } 
          </View>
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
        </Pressable>
      </ReAnimated.View>
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
    borderRadius: 15,
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#00000020',
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.2)',
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
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.2)',
  },

  taskContent: {
    flex: 1,
    paddingVertical: 12,
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
