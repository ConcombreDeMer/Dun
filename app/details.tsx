import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { taskEmitter } from "../lib/eventEmitter";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { getImageSource } from "../lib/imageHelper";

export default function Details() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { colors, theme } = useTheme();

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
    };

    taskEmitter.on("taskUpdated", handleEditTask);

    if (id) {
      fetchTask();
    }

    return () => {
      taskEmitter.off("taskUpdated", handleEditTask);
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Tâche non trouvée</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.button} />
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Détails</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainView}>
        <Text style={[styles.taskName, { color: colors.text }]}>{task.name}</Text>

        {task.description && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{task.description}</Text>
          </View>
        )}

        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Statut</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>
            {task.done ? "✓ Complétée" : "En cours"}
          </Text>
        </View>

        {task.date && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Date</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              {new Date(task.date).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        )}

        {task.priority && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Priorité</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{task.priority}</Text>
          </View>
        )}

        </View>
      </ScrollView>
      <TouchableOpacity
        onPress={() => router.push(`/edit-task?id=${id}`)}
        disabled={loading}
        style={[styles.editFloatingButton, { backgroundColor: colors.button }]}
      >
        <Image
          style={{ width: 34, height: 34 }}
          source={getImageSource('edit', theme)}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleDeleteTask}
        disabled={loading}
        style={styles.deleteFloatingButton}
      >
        <MaterialIcons name="delete" size={34} color="#fff" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    borderColor: "#000000",
    
  },

  handleContainer: {
    alignItems: "center",
    paddingBottom: 20,
  },

  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ddd",
    borderRadius: 2.5,
  },

  title: {
    fontSize: 55,
    fontFamily: 'Satoshi-Black',
  },

  scrollContent: {
    marginTop: 50,
  },

  mainView: {
    paddingBottom: 100,
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  value: {
    fontSize: 16,
    color: "#000",
  },

  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 30,
    alignItems: "center",
  },

  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  editButton: {
    backgroundColor: "#000000ff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },

  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Satoshi-Bold",
  },

  editFloatingButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 70,
    width: 70,
    borderRadius: 100,
    backgroundColor: "#000000ff",
    position: "absolute",
    bottom: 30,
    right: 30,
  },

  deleteFloatingButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 70,
    width: 70,
    borderRadius: 100,
    backgroundColor: "#FF3B30",
    position: "absolute",
    bottom: 30,
    left: 30,
  },
});