import { useRouter } from "expo-router";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { StyleSheet } from "react-native";

export default function CreateTask() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateTask = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom de la tâche est requis");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("Tasks").insert([
        {
          name: name.trim(),
          description: description.trim(),
          done: false,
          date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        Alert.alert("Erreur", error.message);
        return;
      }

      Alert.alert("Succès", "Tâche créée avec succès");
      setName("");
      setDescription("");
      router.back();
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainView}>
          <Text style={styles.title}>
            Créer une tâche
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Nom *
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Entrez le nom de la tâche"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.label}>
              Description
            </Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Entrez la description de la tâche"
              value={description}
              onChangeText={setDescription}
              multiline
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            onPress={handleCreateTask}
            disabled={loading}
            style={[styles.createButton, loading && styles.createButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>
                Créer
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              X
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  mainView: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  descriptionContainer: {
    marginBottom: 30,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 70,
    width: 70,
    borderRadius: 100,
    backgroundColor: "#000000ff",
  },
  backButtonText: {
    color: "#ffffffff",
    fontSize: 16,
  },
});