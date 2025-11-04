import { useRouter, useLocalSearchParams } from "expo-router";
import { Text, View, TouchableOpacity, ActivityIndicator, StyleSheet, Animated, PanResponder, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import * as Haptics from "expo-haptics";
import { taskEmitter } from "../lib/eventEmitter";

export default function Details() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          Animated.event([null, { dy: pan.y }], {
            useNativeDriver: false,
          })(evt, gestureState);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          router.back();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("Tasks")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Erreur lors de la récupération de la tâche:", error);
          return;
        }

        setTask(data);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    const handleEditTask = () => {
      fetchTask();
      taskEmitter.on("taskUpdated", handleEditTask);
    }

    taskEmitter.on("taskUpdated", handleEditTask);


    if (id) {
      fetchTask();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Tâche non trouvée</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    );
  }


  const handleDeleteTask = async () => {
    Alert.alert(
      "Supprimer la tâche",
      "Êtes-vous sûr de vouloir supprimer cette tâche ?",
      [
        {
          text: "Annuler",
          onPress: () => { },
          style: "cancel",
        },
        {
          text: "Supprimer",
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const { error } = await supabase
                .from("Tasks")
                .delete()
                .eq("id", id);

              if (error) {
                console.error("Erreur lors de la suppression de la tâche:", error);
                Alert.alert("Erreur", "Impossible de supprimer la tâche");
                return;
              }

              // Émettre un signal de suppression
              taskEmitter.emit("taskDeleted", id);

              router.back();
            } catch (error) {
              console.error("Erreur:", error);
              Alert.alert("Erreur", "Une erreur s'est produite");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Détails</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.taskName}>{task.name}</Text>

        {task.description && (
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{task.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Statut</Text>
          <Text style={styles.value}>{task.done ? "✓ Complétée" : "En cours"}</Text>
        </View>

        {task.date && (
          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{new Date(task.date).toLocaleDateString("fr-FR")}</Text>
          </View>
        )}

        {task.priority && (
          <View style={styles.section}>
            <Text style={styles.label}>Priorité</Text>
            <Text style={styles.value}>{task.priority}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteTask}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
          <Text style={styles.deleteButtonText}>Supprimer la tâche</Text>
        </TouchableOpacity>


        <TouchableOpacity
          onPress={() => router.push(`/edit-task?id=${id}`)}
          style={{ marginTop: 20, alignItems: "center" }}
        >
          <Text>EDIT</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ddd",
    borderRadius: 2.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  taskName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#000",
  },
  section: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  label: {
    fontSize: 14,
    color: "#999",
    marginBottom: 8,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    color: "#000",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 30,
    gap: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});