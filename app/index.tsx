import { Link, useFocusEffect } from "expo-router";
import { Text, View, Pressable, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export default function Index() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("Tasks")
        .select("*")
        .order("created_at", { ascending: false });

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

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const handleAddPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tâches</Text>
        <View style={styles.calendar}></View>
        <Text style={styles.date}>Aujourd'hui</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          renderItem={({ item }) => (
            <Link href={`/details?id=${item.id}`} asChild>
              <TouchableOpacity style={item.done ? styles.taskItemDone : styles.taskItem}>
                <View style={styles.taskContent}>
                  <Text style={item.done ? styles.taskNameDone : styles.taskName}>{item.name}</Text>
                </View>
                <View
                  style={[
                    styles.taskCheckbox,
                    item.done && styles.taskCheckboxDone,
                  ]}
                />
              </TouchableOpacity>
            </Link>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucune tâche pour aujourd'hui</Text>
          }
        />
      )}

      <Link style={styles.addButton} href="/create-task" asChild>
        <TouchableOpacity onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 60,
  },

  header: {
    paddingBottom: 10,
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
    textAlign: 'center',
    lineHeight: 65,
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
  addButtonText: {
    color: 'white',
    fontSize: 30,
    textAlign: 'center',
    lineHeight: 65,
  },

});
