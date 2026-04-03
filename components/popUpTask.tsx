import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { fromAppDateKey, toAppDateKey } from "../lib/date";
import { useFont } from "../lib/FontContext";
import { useAppTranslation } from "../lib/i18n";
import { useTheme } from "../lib/ThemeContext";
import AnimatedCheckbox from "./checkboxAnimated";
import DateInput from "./dateInput";
import PrimaryButton from "./primaryButton";
import SecondaryButton from "./secondaryButton";
import SimpleInput from "./textInput";

type TaskDraft = {
    name: string;
    description: string;
    taskDate: Date;
    isDone: boolean;
};

type ActiveField = "name" | "description" | null;

export default function PopUpTask({ onClose, id }: { onClose: () => void, id?: number }) {
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();
    const [task, setTask] = useState<any>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [taskDate, setTaskDate] = useState<Date>(new Date());
    const [last_update_date, setLastUpdateDate] = useState<Date | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [activeField, setActiveField] = useState<ActiveField>(null);
    const [inputLock, setInputLock] = useState(false);
    const queryClient = useQueryClient();
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const hydratedTaskIdRef = useRef<number | null>(null);
    const lastSavedTextSnapshotRef = useRef("");
    const latestDraftRef = useRef<TaskDraft>({
        name: "",
        description: "",
        taskDate: new Date(),
        isDone: false,
    });

    const taskQuery = useQuery({
        queryKey: ['tasks', id],
        queryFn: getTask,
        enabled: !!id,
        gcTime: 1000 * 60 * 5,
        staleTime: 1000 * 60 * 2,
    });

    async function getTask() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("Utilisateur non connecté");
        }

        const { data, error } = await supabase
            .from("Tasks")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }



    const deleteDayMutation = useMutation({
        mutationFn: async ({ date, done }: { date: Date; done: boolean }) => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Utilisateur non connecté");
            }

            const { data: existingDay, error: fetchError } = await supabase
                .from("Days")
                .select("*")
                .eq("user_id", user.id)
                .eq("date", toAppDateKey(date))
                .maybeSingle();

            if (fetchError) {
                console.error("Erreur lors de la récupération du jour:", fetchError);
                throw new Error(fetchError.message);
            }

            if (!existingDay) {
                return;
            }

            const newTotal = Math.max((existingDay.total || 1) - 1, 0);
            const newDoneCount = done
                ? Math.max((existingDay.done_count || 1) - 1, 0)
                : (existingDay.done_count || 0);

            if (newTotal === 0) {
                const { error: deleteError } = await supabase
                    .from("Days")
                    .delete()
                    .eq("id", existingDay.id);

                if (deleteError) {
                    console.error("Erreur lors de la suppression du jour:", deleteError);
                    throw new Error(deleteError.message);
                }
                return;
            }

            const { error: updateError } = await supabase
                .from("Days")
                .update({
                    total: newTotal,
                    done_count: newDoneCount,
                    updated_at: toAppDateKey(new Date()),
                })
                .eq("id", existingDay.id);

            if (updateError) {
                console.error("Erreur lors de la mise à jour du jour:", updateError);
                throw new Error(updateError.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['days'] });
        },
    });

    const doneDayMutation = useMutation({
        mutationFn: async ({ date, nextDone }: { date: Date; nextDone: boolean }) => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Utilisateur non connecté");
            }

            const { data: existingDay, error: fetchError } = await supabase
                .from("Days")
                .select("*")
                .eq("user_id", user.id)
                .eq("date", toAppDateKey(date))
                .maybeSingle();

            if (fetchError) {
                console.error("Erreur lors de la récupération du jour:", fetchError);
                throw new Error(fetchError.message);
            }

            if (!existingDay) {
                return;
            }

            const newDoneCount = nextDone
                ? (existingDay.done_count || 0) + 1
                : Math.max((existingDay.done_count || 1) - 1, 0);

            const { error: updateError } = await supabase
                .from("Days")
                .update({
                    done_count: newDoneCount,
                    updated_at: toAppDateKey(new Date()),
                })
                .eq("id", existingDay.id);

            if (updateError) {
                console.error("Erreur lors de la mise à jour du jour:", updateError);
                throw new Error(updateError.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['days'] });
        },
    });


    const changeDayMutation = useMutation({
        mutationFn: async ({ previousDate, nextDate, done }: { previousDate: Date; nextDate: Date; done: boolean }) => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Utilisateur non connecté");
            }

            const previousDayKey = toAppDateKey(previousDate);
            const nextDayKey = toAppDateKey(nextDate);

            if (previousDayKey !== nextDayKey) {
                const { data: oldDay, error: fetchOldDayError } = await supabase
                    .from("Days")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("date", previousDayKey)
                    .maybeSingle();

                if (fetchOldDayError) {
                    console.error("Erreur lors de la récupération de l'ancien jour:", fetchOldDayError);
                    throw new Error(fetchOldDayError.message);
                }

                if (oldDay) {
                    const newTotal = Math.max((oldDay.total || 1) - 1, 0);
                    const newDoneCount = done
                        ? Math.max((oldDay.done_count || 1) - 1, 0)
                        : (oldDay.done_count || 0);

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
                        const { error: updateError } = await supabase
                            .from("Days")
                            .update({
                                total: newTotal,
                                done_count: newDoneCount,
                                updated_at: toAppDateKey(new Date()),
                            })
                            .eq("id", oldDay.id);

                        if (updateError) {
                            console.error("Erreur lors de la mise à jour de l'ancien jour:", updateError);
                            throw new Error(updateError.message);
                        }
                    }
                }
            }

            const { data: existingDay, error: fetchError } = await supabase
                .from("Days")
                .select("*")
                .eq("user_id", user.id)
                .eq("date", nextDayKey)
                .maybeSingle();

            if (fetchError) {
                console.error("Erreur lors de la récupération du jour:", fetchError);
                throw new Error(fetchError.message);
            }

            if (!existingDay) {
                const { error: insertError } = await supabase.from("Days").insert([
                    {
                        user_id: user.id,
                        date: nextDayKey,
                        total: 1,
                        done_count: done ? 1 : 0,
                        updated_at: toAppDateKey(new Date()),
                    },
                ]);

                if (insertError) {
                    console.error("Erreur lors de l'insertion du jour:", insertError);
                    throw new Error(insertError.message);
                }
                return;
            }

            const shouldIncrement = previousDayKey !== nextDayKey ? 1 : 0;

            const { error: updateError } = await supabase
                .from("Days")
                .update({
                    total: (existingDay.total || 0) + shouldIncrement,
                    done_count: done
                        ? (existingDay.done_count || 0) + shouldIncrement
                        : (existingDay.done_count || 0),
                    updated_at: toAppDateKey(new Date()),
                })
                .eq("id", existingDay.id);

            if (updateError) {
                console.error("Erreur lors de la mise à jour du jour:", updateError);
                throw new Error(updateError.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['days'] });
        },
    });


    const deleteTaskMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Utilisateur non connecté");
            }

            // Récupérer la tâche AVANT la suppression pour avoir la date
            const { data: taskData, error: fetchError } = await supabase
                .from("Tasks")
                .select("id, date, order")
                .eq("id", id)
                .eq("user_id", user.id)
                .single();

            if (fetchError || !taskData) {
                throw new Error(fetchError?.message || t("task.popup.notFound"));
            }

            const deletedTaskDate = taskData.date;

            // Supprimer la tâche
            const { error: deleteError } = await supabase
                .from("Tasks")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (deleteError) {
                throw new Error(deleteError.message);
            }

            // Récupérer TOUTES les tâches de la même journée (sauf celle supprimée)
            if (deletedTaskDate) {
                const { data: allTasks, error: fetchAllError } = await supabase
                    .from("Tasks")
                    .select("id, order")
                    .eq("user_id", user.id)
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
                            .eq("id", task.id)
                            .eq("user_id", user.id);

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
            onClose();
        },
        onError: (error: any) => {
            Alert.alert(t("common.alerts.errorTitle"), error.message || t("common.alerts.genericError"));
        }
    });

    const updateTaskMutation = useMutation({
        mutationFn: async (draft: TaskDraft) => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Utilisateur non connecté");
            }

            const trimmedName = draft.name.trim();
            if (!trimmedName) {
                throw new Error(t("task.popup.nameRequired"));
            }

            const savedAt = new Date().toISOString();
            const { error } = await supabase
                .from("Tasks")
                .update({
                    name: trimmedName,
                    description: draft.description.trim(),
                    date: toAppDateKey(draft.taskDate),
                    done: draft.isDone,
                    last_update_date: savedAt,
                })
                .eq("id", id)
                .eq("user_id", user.id);
            if (error) {
                throw new Error(error.message);
            }

            return {
                draft: {
                    ...draft,
                    name: trimmedName,
                    description: draft.description.trim(),
                },
                savedAt,
            };
        },
        onSuccess: ({ draft, savedAt }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setTask((current: any) => current ? {
                ...current,
                name: draft.name,
                description: draft.description,
                date: toAppDateKey(draft.taskDate),
                done: draft.isDone,
                last_update_date: savedAt,
            } : current);
            setLastUpdateDate(new Date(savedAt));
            const savedTextSnapshot = JSON.stringify({
                name: draft.name,
                description: draft.description,
            });
            lastSavedTextSnapshotRef.current = savedTextSnapshot;
            setHasChanges(savedTextSnapshot !== JSON.stringify({
                name: latestDraftRef.current.name.trim(),
                description: latestDraftRef.current.description.trim(),
            }));
        },
        onError: (error: any) => {
            console.error("Erreur lors de la sauvegarde:", error);
        }
    });

    const enqueueTaskSave = useCallback(async (draft: TaskDraft) => {
        const nextDraft = {
            ...draft,
            name: draft.name.trim(),
            description: draft.description.trim(),
        };

        if (!nextDraft.name) {
            return;
        }

        saveQueueRef.current = saveQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                const nextTextSnapshot = JSON.stringify({
                    name: nextDraft.name,
                    description: nextDraft.description,
                });

                if (nextTextSnapshot === lastSavedTextSnapshotRef.current) {
                    return;
                }

                await updateTaskMutation.mutateAsync(nextDraft);
            });

        return saveQueueRef.current;
    }, [updateTaskMutation]);

    useEffect(() => {
        if (!taskQuery.data) {
            return;
        }

        if (hydratedTaskIdRef.current === taskQuery.data.id) {
            return;
        }

        const hydratedDraft = {
            name: taskQuery.data.name || "",
            description: taskQuery.data.description || "",
            taskDate: taskQuery.data.date ? fromAppDateKey(taskQuery.data.date) : new Date(),
            isDone: taskQuery.data.done || false,
        };

        hydratedTaskIdRef.current = taskQuery.data.id;
        setTask(taskQuery.data);
        setName(hydratedDraft.name);
        setDescription(hydratedDraft.description);
        setTaskDate(hydratedDraft.taskDate);
        setIsDone(hydratedDraft.isDone);
        setLastUpdateDate(taskQuery.data.last_update_date ? new Date(taskQuery.data.last_update_date) : null);
        latestDraftRef.current = hydratedDraft;
        lastSavedTextSnapshotRef.current = JSON.stringify({
            name: hydratedDraft.name.trim(),
            description: hydratedDraft.description.trim(),
        });
        setHasChanges(false);
    }, [taskQuery.data]);

    useEffect(() => {
        latestDraftRef.current = { name, description, taskDate, isDone };
    }, [name, description, taskDate, isDone]);

    useEffect(() => {
        if (!task) {
            return;
        }

        const currentTextSnapshot = JSON.stringify({
            name: name.trim(),
            description: description.trim(),
        });

        const changed = currentTextSnapshot !== lastSavedTextSnapshotRef.current;
        setHasChanges(changed);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        if (!changed || !name.trim()) {
            return;
        }

        saveTimeoutRef.current = setTimeout(() => {
            void enqueueTaskSave({
                ...latestDraftRef.current,
            });
        }, 900);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [task, name, description, enqueueTaskSave]);

    useEffect(() => {
        const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
            setActiveField(null);
            setInputLock(false);
        });

        return () => {
            hideSubscription.remove();
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const flushPendingSave = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (!task) {
            return;
        }

        if (!latestDraftRef.current.name.trim()) {
            throw new Error(t("task.popup.nameRequired"));
        }

        await enqueueTaskSave(latestDraftRef.current);
    };

    const handleClose = async () => {
        try {
            await flushPendingSave();
            onClose();
        } catch (error: any) {
            Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
        }
    };

    const loading = taskQuery.isLoading && !task;
    const isTaskReady = !!task;
    const isBusy = updateTaskMutation.isPending
        || deleteTaskMutation.isPending
        || deleteDayMutation.isPending
        || changeDayMutation.isPending
        || doneDayMutation.isPending;
    const isNameEditable = !inputLock && activeField !== "description";
    const isDescriptionEditable = !inputLock && activeField !== "name";

    // if (loading) {
    //     return (
    //         <View style={[styles.container, { backgroundColor: colors.background }]}>
    //             <ActivityIndicator size="large" color={colors.text} />
    //         </View>
    //     );
    // }

    // if (!task) {
    //     return (
    //         <View style={[styles.container, { backgroundColor: colors.background }]}>
    //             <Text style={{ color: colors.text }}>Tâche non trouvée</Text>
    //             <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
    //                 <MaterialIcons name="arrow-back" size={24} color={colors.button} />
    //             </TouchableOpacity>
    //         </View>
    //     );
    // }


    const handleDeleteTask = async () => {
        Alert.alert(
            t("common.alerts.deleteTaskTitle"),
            t("common.alerts.deleteTaskMessage"),
            [
                {
                    text: t("common.actions.cancel"),
                    onPress: () => { },
                    style: "cancel",
                },
                {
                    text: t("common.actions.delete"),
                    onPress: async () => {
                        const currentDate = task?.date ? fromAppDateKey(task.date) : taskDate;
                        const currentDone = task?.done ?? isDone;

                        try {
                            await deleteTaskMutation.mutateAsync();
                            await deleteDayMutation.mutateAsync({ date: currentDate, done: currentDone });
                        } catch (error) {
                            console.error("Erreur lors de la suppression:", error);
                        }
                    },
                    style: "destructive",
                },
            ]
        );
    };

    const handleDateChange = async (date: Date) => {
        const previousDate = task?.date ? fromAppDateKey(task.date) : taskDate;
        const nextDraft = {
            ...latestDraftRef.current,
            taskDate: date,
        };

        setTaskDate(date);
        latestDraftRef.current = nextDraft;

        try {
            await flushPendingSave();
            await updateTaskMutation.mutateAsync(nextDraft);

            if (toAppDateKey(previousDate) !== toAppDateKey(date)) {
                await changeDayMutation.mutateAsync({
                    previousDate,
                    nextDate: date,
                    done: nextDraft.isDone,
                });
            }
        } catch (error: any) {
            setTaskDate(previousDate);
            latestDraftRef.current = {
                ...latestDraftRef.current,
                taskDate: previousDate,
            };
            Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
        }
    };

    const handleToggleTask = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const previousDone = isDone;
        const nextDone = !isDone;
        const nextDraft = {
            ...latestDraftRef.current,
            isDone: nextDone,
        };

        setIsDone(nextDone);
        latestDraftRef.current = nextDraft;

        try {
            await flushPendingSave();
            await updateTaskMutation.mutateAsync(nextDraft);
            await doneDayMutation.mutateAsync({ date: nextDraft.taskDate, nextDone });
        } catch (error: any) {
            setIsDone(previousDone);
            latestDraftRef.current = {
                ...latestDraftRef.current,
                isDone: previousDone,
            };
            Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
        }
    };

    const formatLastUpdateDate = (date: Date | null): string => {
        if (!date) return "";

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);

        // Si la différence est inférieure à 10 minutes

        if (diffSeconds === 0) {
            return t("task.popup.now");
        }

        if (diffMinutes < 10) {
            if (diffSeconds < 60) {
                return t("task.popup.secondsAgo", { count: diffSeconds });
            } else {
                return t("task.popup.minutesAgo", { count: diffMinutes });
            }
        }

        // Sinon, afficher le format complet
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const secondes = date.getSeconds().toString().padStart(2, "0");

        return t("task.popup.fullDate", {
            day,
            month,
            year,
            hours,
            minutes,
            seconds: secondes,
        });
    };



    return (
        <Animated.View
            entering={FadeIn.springify().duration(500)}
            exiting={FadeOut.springify().duration(500)}
            style={styles.container}
        >

            <Animated.View
            >

                {isTaskReady && !loading && !name.trim() && (
                    <View
                        style={[styles.nameAlert, { backgroundColor: colors.danger }]}>
                        <Text style={{ color: colors.text, fontSize: fontSizes.base }}>{t("task.popup.nameRequired")}</Text>
                    </View>
                )}


                <View
                    style={[styles.card, { backgroundColor: "transparent" }]}
                >


                    <View
                        style={styles.header}
                    >
                        {!loading && (
                            <SecondaryButton
                                onPress={handleClose}
                                image="xmark"
                            />
                        )}
                    </View>


                    <Animated.View
                        entering={FadeIn.springify().duration(500)}
                        exiting={FadeOut.springify().duration(500)}
                        style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                    >
                        {!isTaskReady || loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.text} />
                            </View>
                        ) : (
                            <>
                                <ScrollView
                                    style={styles.scrollContent}
                                    contentContainerStyle={styles.scrollContentInner}
                                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                    alwaysBounceVertical
                                    bounces
                                    scrollEventThrottle={16}
                                    onScrollBeginDrag={() => {
                                        if (activeField) {
                                            setInputLock(true);
                                        }
                                    }}
                                    onScrollEndDrag={() => {
                                        if (!Keyboard.isVisible()) {
                                            setInputLock(false);
                                        }
                                    }}
                                >
                                    <SimpleInput
                                        value={name}
                                        onChangeText={setName}
                                        editable={isNameEditable}
                                        onFocus={() => {
                                            setInputLock(false);
                                            setActiveField("name");
                                        }}
                                        onBlur={() => {
                                            if (!Keyboard.isVisible()) {
                                                setActiveField(null);
                                                setInputLock(false);
                                            }
                                        }}
                                        bold
                                        transparent
                                        style={{ height: '5%' }}
                                        scale="large"
                                        fontSize="4xl"
                                    />

                                    <SimpleInput
                                        value={description}
                                        onChangeText={setDescription}
                                        editable={isDescriptionEditable}
                                        onFocus={() => {
                                            setInputLock(false);
                                            setActiveField("description");
                                        }}
                                        onBlur={() => {
                                            if (!Keyboard.isVisible()) {
                                                setActiveField(null);
                                                setInputLock(false);
                                            }
                                        }}
                                        placeholder={t("task.popup.insertDescription")}
                                        multiline
                                        style={{ overflow: "hidden", textAlignVertical: "top", height: '95%', boxShadow: `inset 0px -25px 29px -10px ${colors.card}` }}
                                        transparent
                                    />
                                </ScrollView>
                                <Text style={[{ color: colors.textSecondary, fontSize: fontSizes.xs, alignSelf: "center" }]}>
                                    {hasChanges || updateTaskMutation.isPending
                                        ? t("task.popup.lastUpdated", { date: "..." })
                                        : t("task.popup.lastUpdated", { date: formatLastUpdateDate(last_update_date) })}
                                </Text>

                                <View style={styles.bottom}>
                                    <PrimaryButton
                                        size="XS"
                                        width={48}
                                        type="danger"
                                        image="trash.fill"
                                        onPress={handleDeleteTask}
                                    />

                                    <DateInput
                                        value={taskDate}
                                        onChange={handleDateChange}
                                        disabled={isBusy}
                                        bold
                                    />

                                    <AnimatedCheckbox
                                        checked={isDone}
                                        onChange={handleToggleTask}
                                        size={48}
                                    />
                                </View>
                            </>
                        )}
                    </Animated.View>

                </View>
            </Animated.View>
        </Animated.View>
    );
}
const styles = StyleSheet.create({

    container: {
        position: 'relative',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },

    blur: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
    },

    nameAlert: {
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
        // backgroundColor: "#a1232338",
    },

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },


    card: {
        // borderRadius: 30,
        // width: "90%",
        // height: "80%",
        alignSelf: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },

    header: {
        position: "absolute",
        top: 10,
        right: 0,
        zIndex: 10,
    },
    title: {
        fontFamily: 'Satoshi-Black',
    },

    scrollContent: {
        width: "100%",
        height: "85%",
    },

    scrollContentInner: {
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
    },

    lottieAnimation: {
        width: 150,
        height: 150,
    },

});
