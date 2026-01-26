import AnimatedCheckbox from "@/components/checkboxAnimated";
import DateInput from "@/components/dateInput";
import PrimaryButton from "@/components/primaryButton";
import SimpleInput from "@/components/textInput";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useTheme } from "../lib/ThemeContext";
import { taskEmitter } from "../lib/eventEmitter";
import { supabase } from "../lib/supabase";

export default function Details() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [last_update_date, setLastUpdateDate] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const { colors, theme } = useTheme();
  const queryClient = useQueryClient();
  const initialDate = task && task.date ? new Date(task.date) : new Date();



  const taskQuery = useQuery({
    queryKey: ['tasks', id],
    queryFn: getTask,
  });

  async function getTask() {
    const { data, error } = await supabase
      .from("Tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }



  // Ref pour gérer les mutations en queue (éviter les race conditions)
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  const deleteDayMutation = useMutation({
    mutationFn: async () => {
      // Queue les mutations pour les exécuter séquentiellement
      return new Promise<void>((resolve, reject) => {
        mutationQueueRef.current = mutationQueueRef.current.then(async () => {
          try {
            // Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
              throw new Error("Utilisateur non connecté");
            }

            // Mettre à jour le jour associé à la tâche supprimée
            const { data: existingDay, error: fetchError } = await supabase
              .from("Days")
              .select("*")
              .eq("user_id", user.id)
              .eq("date", selectedDate.toDateString())
              .maybeSingle();

            if (fetchError) {
              console.error("Erreur lors de la récupération du jour:", fetchError);
              throw new Error(fetchError.message);
            }

            if (existingDay) {
              const newTotal = Math.max((existingDay.total || 1) - 1, 0);
              const newDoneCount = isDone
                ? Math.max((existingDay.done_count || 1) - 1, 0)
                : (existingDay.done_count || 0);

              // si newTotal est 0, supprimer le jour
              if (newTotal === 0) {
                const { error: deleteError } = await supabase
                  .from("Days")
                  .delete()
                  .eq("id", existingDay.id);

                if (deleteError) {
                  console.error("Erreur lors de la suppression du jour:", deleteError);
                  throw new Error(deleteError.message);
                }
                resolve();
                return;
              }

              // Sinon, mettre à jour le total

              const { error: updateError } = await supabase
                .from("Days")
                .update({
                  total: newTotal,
                  done_count: newDoneCount,
                  updated_at: new Date().toDateString(),
                })
                .eq("id", existingDay.id);

              if (updateError) {
                console.error("Erreur lors de la mise à jour du jour:", updateError);
                throw new Error(updateError.message);
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
    },
  });

  const doneDayMutation = useMutation({
    mutationFn: async () => {
      // Queue les mutations pour les exécuter séquentiellement
      return new Promise<void>((resolve, reject) => {
        mutationQueueRef.current = mutationQueueRef.current.then(async () => {
          try {
            // Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
              throw new Error("Utilisateur non connecté");
            }

            // Mettre à jour le jour associé à la tâche modifiée
            const { data: existingDay, error: fetchError } = await supabase
              .from("Days")
              .select("*")
              .eq("user_id", user.id)
              .eq("date", selectedDate.toDateString())
              .maybeSingle();

            if (fetchError) {
              console.error("Erreur lors de la récupération du jour:", fetchError);
              throw new Error(fetchError.message);
            }

            if (existingDay) {
              const newDoneCount = isDone
                ? Math.max((existingDay.done_count || 1) - 1, 0)
                : (existingDay.done_count || 0) + 1;

              const { error: updateError } = await supabase
                .from("Days")
                .update({
                  done_count: newDoneCount,
                  updated_at: new Date().toDateString(),
                })
                .eq("id", existingDay.id);

              if (updateError) {
                console.error("Erreur lors de la mise à jour du jour:", updateError);
                throw new Error(updateError.message);
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
    },
  });


  const changeDayMutation = useMutation({
    mutationFn: async () => {
      // Queue les mutations pour les exécuter séquentiellement
      return new Promise<void>((resolve, reject) => {
        mutationQueueRef.current = mutationQueueRef.current.then(async () => {
          try {
            // Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
              throw new Error("Utilisateur non connecté");
            }

            // Retirer la tâche de l'ancien jour
            const { data: oldDay, error: fetchOldDayError } = await supabase
              .from("Days")
              .select("*")
              .eq("user_id", user.id)
              .eq("date", initialDate.toDateString())
              .maybeSingle();

            if (fetchOldDayError) {
              console.error("Erreur lors de la récupération de l'ancien jour:", fetchOldDayError);
              throw new Error(fetchOldDayError.message);
            }

            if (oldDay) {
              const newTotal = Math.max((oldDay.total || 1) - 1, 0);
              const newDoneCount = isDone
                ? Math.max((oldDay.done_count || 1) - 1, 0)
                : (oldDay.done_count || 0);

              // si newTotal est 0, supprimer le jour
              if (newTotal === 0) {
                const { error: deleteError } = await supabase
                  .from("Days")
                  .delete()
                  .eq("id", oldDay.id);

                if (deleteError) {
                  console.error("Erreur lors de la suppression de l'ancien jour:", deleteError);
                  throw new Error(deleteError.message);
                }
              } else {
                // Sinon, mettre à jour le total
                const { error: updateError } = await supabase
                  .from("Days")
                  .update({
                    total: newTotal,
                    done_count: newDoneCount,
                    updated_at: new Date().toDateString(),
                  })
                  .eq("id", oldDay.id);

                if (updateError) {
                  console.error("Erreur lors de la mise à jour de l'ancien jour:", updateError);
                  throw new Error(updateError.message);
                }
              }
            }

            // Mettre à jour le jour associé à la tâche modifiée
            const { data: existingDay, error: fetchError } = await supabase
              .from("Days")
              .select("*")
              .eq("user_id", user.id)
              .eq("date", selectedDate.toDateString())
              .maybeSingle();

            if (fetchError) {
              console.error("Erreur lors de la récupération du jour:", fetchError);
              throw new Error(fetchError.message);
            }

            // Si le jour n'existe pas, le créer
            if (!existingDay) {
              const { error: insertError } = await supabase.from("Days").insert([
                {
                  user_id: user.id,
                  date: selectedDate.toDateString(),
                  total: 1,
                  done_count: isDone ? 1 : 0,
                  updated_at: new Date().toDateString(),
                },
              ]);

              if (insertError) {
                console.error("Erreur lors de l'insertion du jour:", insertError);
                throw new Error(insertError.message);
              }
            }

            // Si le jour existe déjà, incréementer "total" et mettre à jour "updated_at"
            else {
              const { error: updateError } = await supabase
                .from("Days")
                .update({
                  total: (existingDay.total || 0) + 1,
                  done_count: isDone ? (existingDay.done_count || 0) + 1 : (existingDay.done_count || 0),
                  updated_at: new Date().toDateString(),
                })
                .eq("id", existingDay.id);

              if (updateError) {
                console.error("Erreur lors de la mise à jour du jour:", updateError);
                throw new Error(updateError.message);
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
    },
  });


  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      // Récupérer la tâche AVANT la suppression pour avoir la date
      const { data: taskData, error: fetchError } = await supabase
        .from("Tasks")
        .select("id, date, order")
        .eq("id", id)
        .single();

      if (fetchError || !taskData) {
        throw new Error(fetchError?.message || "Tâche non trouvée");
      }

      const deletedTaskDate = taskData.date;

      // Supprimer la tâche
      const { error: deleteError } = await supabase
        .from("Tasks")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Récupérer TOUTES les tâches de la même journée (sauf celle supprimée)
      if (deletedTaskDate) {
        const { data: allTasks, error: fetchAllError } = await supabase
          .from("Tasks")
          .select("id, order")
          .eq("date", deletedTaskDate)
          .order("order", { ascending: true });

        if (fetchAllError) {
          console.error("Erreur lors de la récupération des tâches:", fetchAllError);
          return;
        }

        // Recalculer les orders de 1 à N pour toutes les tâches restantes
        let newOrder = 1;
        for (const task of (allTasks || [])) {
          if (task.order !== newOrder) {
            const { error: updateError } = await supabase
              .from("Tasks")
              .update({ order: newOrder })
              .eq("id", task.id);

            if (updateError) {
              console.error("Erreur lors de la mise à jour de l'order:", updateError);
            }
          }
          newOrder++;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      taskEmitter.emit("taskDeleted", id);
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Erreur", error.message || "Impossible de supprimer la tâche");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        return;
      }

      const { error } = await supabase
        .from("Tasks")
        .update({
          name: name.trim(),
          description: description.trim(),
          date: selectedDate.toDateString(),
          done: isDone,
          last_update_date: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  });

  useEffect(() => {
    if (!task) return;

    const isModified =
      name !== task.name ||
      description !== (task.description || "") ||
      selectedDate.toDateString() !== (task.date ? new Date(task.date).toDateString() : new Date().toDateString()) ||
      isDone !== task.done;

    setHasChanges(isModified);
  }, [name, description, selectedDate, task, isDone]);

  // Sauvegarde automatique avec debounce
  useEffect(() => {
    if (!hasChanges || !name.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      updateTaskMutation.mutate();
    }, 500);

    return () => clearTimeout(timer);
  }, [hasChanges]);


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
        setLastUpdateDate(data.last_update_date ? new Date(data.last_update_date) : null);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    const handleEditTask = () => {
      fetchTask();
    };

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
          onPress: () => {
            deleteTaskMutation.mutate();
            deleteDayMutation.mutate();
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    changeDayMutation.mutate();
  };

  const handleToggleTask = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDone(!isDone);
    doneDayMutation.mutate();
  };

  const formatLastUpdateDate = (date: Date | null): string => {
    if (!date) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    // Si la différence est inférieure à 10 minutes

    if (diffSeconds == 0) {
      return `à l'instant`;
    }

    if (diffMinutes < 10) {
      if (diffSeconds < 60) {
        return `il y a ${diffSeconds} secondes`;
      } else {
        return `il y a ${diffMinutes} minutes`;
      }
    }

    // Sinon, afficher le format complet
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const secondes = date.getSeconds().toString().padStart(2, "0");

    return `${day}/${month}/${year} à ${hours}:${minutes}:${secondes}`;
  };



  return (

    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <View style={styles.scrollContent}>
          <SimpleInput
            value={taskQuery.data ? taskQuery.data.name : name}
            onChangeText={setName}
            bold
            transparent
            style={{ height: '5%' }}
            scale="large"
            fontSize={25}
          />


          {!name.trim() && (
            <View
              style={[styles.nameAlert, { backgroundColor: colors.danger }]}>
              <Text style={{ color: colors.dangerText }}>Le nom de la tâche est requis</Text>
            </View>
          )}

          <SimpleInput
            value={description}
            onChangeText={setDescription}
            placeholder="Insérer une description"
            multiline
            style={{ overflow: "hidden", textAlignVertical: "top", height: '95%' }}
            transparent
            fontSize={18}
          />

        </View>
        <Text style={[{ color: colors.textSecondary, fontSize: 12, alignSelf: "center" }]}>
          Dernière mise à jour : {formatLastUpdateDate(taskQuery.data ? new Date(taskQuery.data.last_update_date) : last_update_date)}
        </Text>

        <View style={styles.bottom}>
          <PrimaryButton
            size="XS"
            type="danger"
            image="delete"
            onPress={handleDeleteTask}
          />

          <DateInput
            value={selectedDate}
            onChange={handleDateChange}
            disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
            bold
          />

          <AnimatedCheckbox
            checked={isDone}
            onChange={handleToggleTask}
            size={64}
          />
        </View>

      </View>

    </View>




  );
}

const styles = StyleSheet.create({


  nameAlert: {
    fontSize: 14,
    position: "absolute",
    top: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "center",
  },


  bottom: {
    flexDirection: "row",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "flex-end",
    width: "100%",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },

  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",

  },

  card: {
    borderRadius: 30,
    width: "90%",
    height: "80%",
    alignSelf: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    marginTop: 80,
    paddingBottom: 70,
  },


  title: {
    fontSize: 55,
    fontFamily: 'Satoshi-Black',
  },

  scrollContent: {
    display: "flex",
    flexDirection: "column",
    height: "98%",
    paddingHorizontal: 10,
    overflow: "hidden",
  },

});