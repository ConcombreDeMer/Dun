import { Link, useFocusEffect, useRouter } from "expo-router";
import { Text, View, Pressable, TouchableOpacity, ActivityIndicator } from "react-native";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useState, useCallback, useEffect } from "react";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withSpring
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";
import { Image } from "react-native";

const TaskItem = ({ item, drag, isActive, handleToggleTask, handleTaskPress, styles }: any) => {
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

  return (
    <Animated.View style={[animatedStyle, shadowStyle]}>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={[
          item.done ? styles.taskItemDone : styles.taskItem,
        ]}
        activeOpacity={0.7}
        onPress={() => !isActive && handleTaskPress(item.id)}
      >
        <View style={styles.taskContent}>
          <Text style={item.done ? styles.taskNameDone : styles.taskName}>{item.name}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.taskCheckbox,
            item.done && styles.taskCheckboxDone,
          ]}
          onPress={() => handleToggleTask(item.id, item.done)}
          activeOpacity={0.7}
        >
          {item.done && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function Index() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("Tasks")
        .select("*")
        .order("order", { ascending: true });

      if (error) {
        console.error("Erreur lors de la récupération des tâches:", error);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleToggleTask = async (taskId: number, currentDone: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await supabase
        .from("Tasks")
        .update({ done: !currentDone })
        .eq("id", taskId);

      if (error) {
        console.error("Erreur lors de la mise à jour de la tâche:", error);
        return;
      }

      // Mettre à jour l'état local
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, done: !currentDone } : task
      ));
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleDragEnd = async ({ data }: { data: any[] }) => {
    setTasks(data);

    // Mettre à jour l'ordre dans Supabase
    try {
      for (let i = 0; i < data.length; i++) {
        const { error } = await supabase
          .from("Tasks")
          .update({ order: i })
          .eq("id", data[i].id);

        if (error) {
          console.error("Erreur lors de la mise à jour de l'ordre:", error);
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
    console.log("Nouveau ordre des tâches enregistré dans Supabase");
  };

  const handleTaskPress = (taskId: number) => {
    router.push(`/details?id=${taskId}`);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tâches</Text>
          <View style={styles.calendar}></View>
          <Text style={styles.date}>Aujourd'hui</Text>
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <DraggableFlatList
              data={tasks}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              persistentScrollbar={true}
              removeClippedSubviews={false}
              contentContainerStyle={styles.flatListContent}
              activationDistance={20}
              onDragEnd={handleDragEnd}
              renderItem={({ item, drag, isActive }) => (
                <TaskItem
                  item={item}
                  drag={drag}
                  isActive={isActive}
                  handleToggleTask={handleToggleTask}
                  handleTaskPress={handleTaskPress}
                  styles={styles}
                />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Aucune tâche pour aujourd'hui</Text>
              }
            />
          )}
        </View>

        <Link style={styles.addButton} href="/create-task" asChild>
          <TouchableOpacity onPress={handleAddPress}>
            <Image
              style={{ width: 34, height: 34, transform: [{ rotate: '45deg' }] }}
              source={require('../assets/images/cancel.png')}
            ></Image>
          </TouchableOpacity>
        </Link>
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
    paddingBottom: 10,
    paddingLeft: '5%',
    paddingRight: '5%',
  },

  listContainer: {
    flex: 1,
  },

  title: {
    fontSize: 55,
    fontFamily: 'Satoshi-Black',
  },

  calendar: {
    marginTop: 20,
    backgroundColor: '#dcdcdcff',
    borderRadius: 10,
    height: 100,
    width: '100%',
  },

  date: {
    fontSize: 38,
    fontFamily: 'Satoshi-Bold',
    marginTop: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  flatListContent: {
    paddingBottom: 120,
  },

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

  taskItemActive: {
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  taskContentContainer: {
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

  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  taskDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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

  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },

  addButton: {
    height: 70,
    width: 70,
    borderRadius: 100,
    backgroundColor: 'black',
    color: 'white',
    fontSize: 30,
    lineHeight: 65,
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
