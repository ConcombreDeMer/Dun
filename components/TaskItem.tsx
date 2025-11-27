import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { use, useCallback, useEffect } from "react";
import { useSharedValue, runOnJS } from "react-native-reanimated";
import Animated, {
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";
import { useTheme } from "../lib/ThemeContext";

interface TaskItemProps {
  item: {
    id: number;
    name: string;
    done: boolean;
  };
  drag: () => void;
  isActive: boolean;
  handleToggleTask: (taskId: number, currentDone: boolean) => void;
  handleTaskPress: (taskId: number) => void;
}

export const TaskItem = ({
  item,
  drag,
  isActive,
  handleToggleTask,
  handleTaskPress,
}: TaskItemProps) => {
  const { colors } = useTheme();
  const dotScale = useSharedValue(item.done ? 100 : 1);
  const isExpanded = useSharedValue(item.done);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isActive ? 1.02 : 1) },
      ],
      opacity: withSpring(isActive ? 1 : 1),
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: withSpring(isActive ? 0.3 : 0),
      elevation: withSpring(isActive ? 5 : 0),
    };
  });

  const dotAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(10 * dotScale.value),
      height: withSpring(10 * dotScale.value),
      borderRadius: withSpring(2.5 * dotScale.value),
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isActive) {
      handleTaskPress(item.id);
    }
  }, [isActive, item.id, handleTaskPress]);

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

  return (
    <Animated.View style={[animatedStyle, shadowStyle]}>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        delayLongPress={100}
        style={taskItemStyle}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.taskContent}>
          <Text style={[
            item.done ? styles.taskNameDone : styles.taskName,
            { color: item.done ? colors.textDone : colors.text }
          ]}>
            {item.name}
          </Text>
        </View>
        <View style={styles.checkboxContainer}>
          <Animated.View style={[styles.checkboxDot, dotAnimatedStyle, { backgroundColor: colors.taskDone }]} />
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
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
    borderRadius: 20,
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00000020',
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
  },

  taskContent: {
    flex: 1,
  },

  taskName: {
    fontSize: 16,
    fontFamily: 'Satoshi-Regular',
    zIndex: 1,
    marginLeft: 10,
  },

  taskNameDone: {
    fontSize: 16,
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
