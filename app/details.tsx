import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
import { useState, useEffect, useCallback } from "react";
import Animated, {
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";
import { taskEmitter } from "../lib/eventEmitter";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { getImageSource } from "../lib/imageHelper";
import PrimaryButton from "@/components/primaryButton";
import Headline from "@/components/headline";
import SimpleInput from "@/components/textInput";
import DateInput from "@/components/dateInput";
import AnimatedCheckbox from "@/components/checkboxAnimated";

export default function Details() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hasChanges, setHasChanges] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const { colors, theme } = useTheme();

  useEffect(() => {
    if (!task) return;

    const isModified =
      name !== task.name ||
      description !== (task.description || "") ||
      selectedDate.toDateString() !== (task.date ? new Date(task.date).toDateString() : new Date().toDateString()) ||
      isDone !== task.done;

    setHasChanges(isModified);
  }, [name, description, selectedDate, task, isDone]);

  // Détecter quand la modal ferme
  useFocusEffect(
    useCallback(() => {
      // Exécuté quand la modal est ouverte
      return () => {
        // Exécuté quand la modal ferme
        console.log("Details closed for task ID:", id);
        // Ne sauvegarder que s'il y a des changements
        if (hasChanges && name.trim()) {
          (async () => {
            try {
              await supabase
                .from("Tasks")
                .update({
                  name: name.trim(),
                  description: description.trim(),
                  date: selectedDate.toDateString(),
                  done: isDone,
                })
                .eq("id", id);

              taskEmitter.emit("taskUpdated");
            } catch (error) {
              console.error("Erreur lors de la sauvegarde:", error);
            }
          })();
        }
      };
    }, [id, hasChanges, name, description, selectedDate, isDone])
  );

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
        setName(data.name);
        setDescription(data.description || "");
        setSelectedDate(data.date ? new Date(data.date) : new Date());
        setIsDone(data.done || false);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    const handleEditTask = () => {
      fetchTask();
    };

    // taskEmitter.on("taskUpdated", handleEditTask);

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

  const handleUpdateTask = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom de la tâche est requis");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("Tasks")
        .update({
          name: name.trim(),
          description: description.trim(),
          date: selectedDate.toDateString(),
          done: isDone,
        })
        .eq("id", id);

      if (error) {
        Alert.alert("Erreur", error.message);
        return;
      }

      Alert.alert("Succès", "Tâche modifiée avec succès");
      setTask({ ...task, done: isDone });
      taskEmitter.emit("taskUpdated");
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleToggleTask = () => {
    setIsDone(!isDone);
  };

  const taskName = task.name || "Tâche sans nom";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <SimpleInput
          value={name}
          onChangeText={setName}
          bold
        />

        <SimpleInput
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <DateInput
          value={selectedDate}
          onChange={handleDateChange}
          disabled={saving}
        />

      </ScrollView>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignSelf: "center", width: "100%", position: "absolute", bottom: 23 }}>
        <PrimaryButton
          size="XS"
          type="danger"
          image="delete"
          onPress={handleDeleteTask}
          disabled={saving}
        />
        {/* {hasChanges && (
          <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={{ alignItems: 'center' }}>
            <PrimaryButton
              size="M"
              type="reverse"
              title="Enregistrer"
              onPress={handleUpdateTask}
              disabled={saving}
            />
          </Animated.View>
        )} */}
        <AnimatedCheckbox
          checked={isDone}
          onChange={handleToggleTask}
          disabled={saving}
          size={64}
        />


      </View>

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
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxHeight: "65%",
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