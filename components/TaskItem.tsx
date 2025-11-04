import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useCallback } from "react";
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

  const handleCheckboxPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleToggleTask(item.id, item.done);
  }, [item.id, item.done, handleToggleTask]);

  const handlePress = useCallback(() => {
    if (!isActive) {
      handleTaskPress(item.id);
    }
  }, [isActive, item.id, handleTaskPress]);

  const taskItemStyle = item.done ? 
    [styles.taskItemDone, { backgroundColor: colors.donePrimary }] :
    [styles.taskItem, { backgroundColor: colors.card }];

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
            { color: item.done ? colors.textSecondary : colors.text }
          ]}>
            {item.name}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.taskCheckbox,
            item.done && { backgroundColor: colors.doneSecondary },
            !item.done && { backgroundColor: colors.border }
          ]}
          onPress={handleCheckboxPress}
          activeOpacity={0.7}
        >
          {item.done && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 70,
    marginTop: 10,
    paddingLeft: 25,
    paddingRight: 25,
    backgroundColor: '#ebebebff',
    justifyContent: 'space-between',
    borderRadius: 10,
    width: '90%',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  taskItemDone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 70,
    marginTop: 10,
    paddingLeft: 25,
    paddingRight: 25,
    backgroundColor: '#CFE7CB',
    justifyContent: 'space-between',
    borderRadius: 10,
    width: '90%',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  taskContent: {
    flex: 1,
  },

  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  taskNameDone: {
    fontSize: 16,
    color: '#666',
    opacity: 0.6,
  },

  taskCheckbox: {
    width: 40,
    height: 40,
    borderRadius: 5,
    marginLeft: 12,
    backgroundColor: '#D9D9D9',
  },

  taskCheckboxDone: {
    backgroundColor: '#9DBD99',
  },

  checkmark: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
});
