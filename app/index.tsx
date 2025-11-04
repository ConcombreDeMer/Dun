import { Link, useFocusEffect, useRouter } from "expo-router";
import { Text, View, Pressable, TouchableOpacity, ActivityIndicator } from "react-native";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useState, useCallback, useEffect } from "react";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "../lib/supabase";
import { Image } from "react-native";
import { taskEmitter } from "../lib/eventEmitter";
import { TaskItem } from "../components/TaskItem";

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

    // Écouter l'événement de suppression
    const handleTaskDeleted = () => {
      fetchTasks();
    };

    taskEmitter.on("taskDeleted", handleTaskDeleted);
    taskEmitter.on("taskAdded", fetchTasks);
    taskEmitter.on("taskUpdated", fetchTasks);


    return () => {
      taskEmitter.off("taskDeleted", handleTaskDeleted);
    };
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

  const handleDeleteTask = (taskId: number) => {
    // Supprimer la tâche de la liste locale
    setTasks(tasks.filter(task => task.id !== taskId));
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

  const handlePlaceholderIndexChange = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

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
              onPlaceholderIndexChange={handlePlaceholderIndexChange}
              renderItem={({ item, drag, isActive }) => (
                <TaskItem
                  item={item}
                  drag={drag}
                  isActive={isActive}
                  handleToggleTask={handleToggleTask}
                  handleTaskPress={handleTaskPress}
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
