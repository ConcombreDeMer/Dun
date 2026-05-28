import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { fromAppDateKey, toAppDateKey } from "../lib/date";
import { useFont } from "../lib/FontContext";
import { useAppTranslation } from "../lib/i18n";
import { updateTaskDraft } from "../lib/tasks";
import { useTheme } from "../lib/ThemeContext";
import { useOptimisticTaskMutations } from "../lib/useOptimisticTaskMutations";
import { useToggleTaskDone } from "../lib/useToggleTaskDone";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type TaskDraft = {
    name: string;
    description: string;
    taskDate: Date;
    isDone: boolean;
};

type ActiveField = "name" | "description" | null;

export default function PopUpTask({ onClose, id }: { onClose: (afterClose?: () => void) => void, id?: number }) {
    const { actualTheme, colors } = useTheme();
    const { fontSizes } = useFont();
    const { t, language } = useAppTranslation();
    const [task, setTask] = useState<any>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [taskDate, setTaskDate] = useState<Date>(new Date());
    const [last_update_date, setLastUpdateDate] = useState<Date | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [activeField, setActiveField] = useState<ActiveField>(null);
    const [inputLock, setInputLock] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());
    const doneProgress = useSharedValue(0);
    const queryClient = useQueryClient();
    const { deleteTaskOptimistically, isTaskDeletePending } = useOptimisticTaskMutations();
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
    const taskToggleQueryKeys = useMemo(() => id ? [["tasks"], ["tasks", id]] : [["tasks"]], [id]);
    const {
        isTaskPending: isTogglePending,
        toggleTaskDone,
    } = useToggleTaskDone({
        queryKeys: taskToggleQueryKeys,
        errorTitle: t("common.alerts.errorTitle"),
        errorMessage: t("common.alerts.genericError"),
        onError: (_taskId, previousDone) => {
            setIsDone(previousDone);
            latestDraftRef.current = {
                ...latestDraftRef.current,
                isDone: previousDone,
            };
            setTask((current: any) => current ? { ...current, done: previousDone } : current);
        },
        onSuccess: (_taskId, nextDone) => {
            setTask((current: any) => current ? { ...current, done: nextDone } : current);
        },
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


    const updateTaskMutation = useMutation({
        mutationFn: async (draft: TaskDraft) => {
            if (!draft.name.trim()) {
                throw new Error(t("task.popup.nameRequired"));
            }

            if (!id) throw new Error(t("task.popup.notFound"));
            return updateTaskDraft(id, draft, {
                previousDateKey: task?.date ?? null,
            });
        },
        onSuccess: ({ draft, savedAt }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['days'] });
            setTask((current: any) => current ? {
                ...current,
                name: draft.name,
                description: draft.description,
                date: toAppDateKey(draft.taskDate),
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
        doneProgress.value = withSpring(isDone ? 1 : 0, {
            damping: 18,
            stiffness: 220,
            mass: 0.7,
            overshootClamping: true,
        });
    }, [doneProgress, isDone]);

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
        || (id ? isTaskDeletePending(id) : false);
    const isNameEditable = !inputLock && activeField !== "description";
    const isDescriptionEditable = !inputLock && activeField !== "name";
    const checkboxDoneBackground = actualTheme === "dark" ? "#314539" : "#E3F4E9";
    const checkboxDoneBorder = actualTheme === "dark" ? "#5A9B73" : "#74BE8C";
    const checkboxDoneIcon = actualTheme === "dark" ? "#89BE9B" : "#4E9C68";

    const doneButtonAnimatedStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            doneProgress.value,
            [0, 1],
            [colors.checkbox, checkboxDoneBackground]
        ),
        borderColor: interpolateColor(
            doneProgress.value,
            [0, 1],
            [colors.border, checkboxDoneBorder]
        ),
        transform: [
            {
                scale: 0.96 + doneProgress.value * 0.04,
            },
        ],
    }));

    const doneCheckAnimatedStyle = useAnimatedStyle(() => ({
        opacity: doneProgress.value,
        transform: [
            {
                scale: 0.6 + doneProgress.value * 0.4,
            },
        ],
    }));

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
                    onPress: () => {
                        if (!id) {
                            Alert.alert(t("common.alerts.errorTitle"), t("task.popup.notFound"));
                            return;
                        }

                        onClose(() => {
                            void deleteTaskOptimistically(id).catch((error: any) => {
                                console.error("Erreur lors de la suppression:", error);
                                Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
                            });
                        });
                    },
                    style: "destructive",
                },
            ]
        );
    };

    const handleDateChange = async (date: Date) => {
        const previousDate = taskDate;
        const nextDraft = {
            ...latestDraftRef.current,
            taskDate: date,
        };

        setTaskDate(date);
        latestDraftRef.current = nextDraft;

        try {
            await flushPendingSave();
            await updateTaskMutation.mutateAsync(nextDraft);
        } catch (error: any) {
            setTaskDate(previousDate);
            latestDraftRef.current = {
                ...latestDraftRef.current,
                taskDate: previousDate,
            };
            Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
        }
    };

    const openDatePicker = () => {
        if (isBusy) {
            return;
        }

        setTempDate(taskDate);
        setShowDatePicker(true);
    };

    const handlePickerChange = (_event: any, date?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
            if (date) {
                void handleDateChange(date);
            }
            return;
        }

        if (date) {
            setTempDate(date);
        }
    };

    const closeDatePicker = () => {
        setShowDatePicker(false);
        void handleDateChange(tempDate);
    };

    const handleToggleTask = async () => {
        if (!task?.id || isTogglePending(task.id)) {
            return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const nextDone = !isDone;
        const nextDraft = {
            ...latestDraftRef.current,
            isDone: nextDone,
        };

        setIsDone(nextDone);
        latestDraftRef.current = nextDraft;
        setTask((current: any) => current ? { ...current, done: nextDone } : current);
        void toggleTaskDone(task.id, isDone);
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

    const formattedTaskDate = taskDate.toLocaleDateString(language === "en" ? "en-US" : "fr-FR", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });



    return (
        <Animated.View
            entering={FadeIn.springify().duration(500)}
            exiting={FadeOut.springify().duration(500)}
            style={styles.container}
        >

            <Animated.View style={styles.surface}>

                {isTaskReady && !loading && !name.trim() && (
                    <View
                        style={[styles.nameAlert, { backgroundColor: colors.danger }]}>
                        <Text style={{ color: colors.text, fontSize: fontSizes.base }}>{t("task.popup.nameRequired")}</Text>
                    </View>
                )}


                <View style={styles.card}>
                    <Animated.View
                        entering={FadeIn.springify().duration(500)}
                        exiting={FadeOut.springify().duration(500)}
                        style={styles.cardContent}
                    >
                        {!isTaskReady || loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.text} />
                            </View>
                        ) : (
                            <>
                                <View style={styles.header}>
                                    <View style={styles.titleColumn}>
                                        <TextInput
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
                                            placeholder={t("task.popup.nameRequired")}
                                            placeholderTextColor={colors.inputPlaceholder}
                                            multiline
                                            maxLength={160}
                                            style={[
                                                styles.titleInput,
                                                {
                                                    color: colors.text,
                                                    fontSize: Math.min(fontSizes["2xl"], 24),
                                                },
                                            ]}
                                        />
                                    </View>

                                    <Pressable
                                        onPress={handleClose}
                                        hitSlop={12}
                                        style={({ pressed }) => [
                                            styles.closeButton,
                                            {
                                                backgroundColor: colors.background,
                                                borderColor: colors.border,
                                                opacity: pressed ? 0.65 : 1,
                                            },
                                        ]}
                                    >
                                        <Feather name="x" size={18} color={colors.textSecondary} />
                                    </Pressable>
                                </View>

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
                                    <TextInput
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
                                        placeholderTextColor={colors.inputPlaceholder}
                                        multiline
                                        style={[
                                            styles.descriptionInput,
                                            {
                                                color: colors.text,
                                                fontSize: fontSizes.base,
                                            },
                                        ]}
                                    />
                                </ScrollView>

                                <View style={styles.footer}>
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.lastUpdatedText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}
                                    >
                                        {hasChanges || updateTaskMutation.isPending
                                            ? t("task.popup.lastUpdated", { date: "..." })
                                            : t("task.popup.lastUpdated", { date: formatLastUpdateDate(last_update_date) })}
                                    </Text>

                                    <View style={styles.bottom}>
                                        <Pressable
                                            onPress={handleDeleteTask}
                                            disabled={isBusy}
                                            hitSlop={8}
                                            style={({ pressed }) => [
                                                styles.iconAction,
                                                styles.dangerAction,
                                                {
                                                    backgroundColor: actualTheme === "dark" ? "#3B2528" : "#FCE7E8",
                                                    borderColor: actualTheme === "dark" ? "#5A3034" : "#F6C6C9",
                                                    opacity: pressed || isBusy ? 0.6 : 1,
                                                },
                                            ]}
                                        >
                                            <Feather name="trash-2" size={19} color={actualTheme === "dark" ? "#FF9BA1" : "#B4232A"} />
                                        </Pressable>

                                        <Pressable
                                            onPress={openDatePicker}
                                            disabled={isBusy}
                                            style={({ pressed }) => [
                                                styles.dateAction,
                                                {
                                                    backgroundColor: colors.background,
                                                    borderColor: colors.border,
                                                    opacity: pressed || isBusy ? 0.7 : 1,
                                                },
                                            ]}
                                        >
                                            <Feather name="calendar" size={17} color={colors.textSecondary} />
                                            <Text
                                                numberOfLines={1}
                                                style={[styles.dateActionText, { color: colors.text, fontSize: fontSizes.sm }]}
                                            >
                                                {formattedTaskDate}
                                            </Text>
                                        </Pressable>

                                        <AnimatedTouchableOpacity
                                            onPress={handleToggleTask}
                                            disabled={task?.id ? isTogglePending(task.id) : false}
                                            hitSlop={8}
                                            activeOpacity={0.85}
                                            style={[
                                                styles.iconAction,
                                                styles.doneAction,
                                                doneButtonAnimatedStyle,
                                                (task?.id && isTogglePending(task.id)) ? styles.disabledAction : null,
                                            ]}
                                        >
                                            <Animated.View style={doneCheckAnimatedStyle}>
                                                <Feather name="check" size={21} color={checkboxDoneIcon} strokeWidth={3.2} />
                                            </Animated.View>
                                        </AnimatedTouchableOpacity>
                                    </View>
                                </View>

                                {showDatePicker && Platform.OS === "ios" && (
                                    <Modal
                                        transparent
                                        visible={showDatePicker}
                                        animationType="fade"
                                        onRequestClose={closeDatePicker}
                                    >
                                        <Pressable
                                            style={styles.datePickerOverlay}
                                            onPress={closeDatePicker}
                                        >
                                            <Pressable
                                                style={[styles.datePickerSheet, { backgroundColor: colors.card }]}
                                                onPress={(event) => event.stopPropagation()}
                                            >
                                                <DateTimePicker
                                                    value={tempDate}
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={handlePickerChange}
                                                />
                                                <Pressable
                                                    onPress={closeDatePicker}
                                                    style={[styles.datePickerDone, { backgroundColor: colors.actionButton }]}
                                                >
                                                    <Feather name="check" size={20} color={colors.buttonText} />
                                                </Pressable>
                                            </Pressable>
                                        </Pressable>
                                    </Modal>
                                )}

                                {showDatePicker && Platform.OS === "android" && (
                                    <DateTimePicker
                                        value={tempDate}
                                        mode="date"
                                        display="default"
                                        onChange={handlePickerChange}
                                    />
                                )}
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
        paddingBottom: 14,
        paddingHorizontal: 14,
    },

    surface: {
        width: "100%",
        height: "100%",
    },

    nameAlert: {
        position: "absolute",
        top: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        alignSelf: "center",
        zIndex: 20,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    card: {
        width: "100%",
        height: "100%",
    },

    cardContent: {
        flex: 1,
        paddingTop: 22,
        paddingHorizontal: 16,
        paddingBottom: 0,
    },

    header: {
        minHeight: 54,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12,
    },

    titleColumn: {
        flex: 1,
        minWidth: 0,
    },

    titleInput: {
        width: "100%",
        minHeight: 42,
        maxHeight: 96,
        paddingTop: 0,
        paddingBottom: 4,
        paddingHorizontal: 0,
        textAlignVertical: "top",
        fontFamily: "Satoshi-Bold",
        lineHeight: 29,
    },

    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
    },

    scrollContent: {
        width: "100%",
        flex: 1,
    },

    scrollContentInner: {
        flexGrow: 1,
        paddingBottom: 16,
    },

    descriptionInput: {
        minHeight: 280,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 24,
        textAlignVertical: "top",
        fontFamily: "Satoshi-Regular",
        lineHeight: 22,
    },

    footer: {
        paddingTop: 10,
        paddingBottom: 0,
        gap: 8,
    },

    lastUpdatedText: {
        alignSelf: "center",
        fontFamily: "Satoshi-Regular",
    },

    bottom: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        width: "100%",
    },

    iconAction: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    dangerAction: {
        backgroundColor: "#FCE7E8",
        borderColor: "#F6C6C9",
    },

    doneAction: {
        borderWidth: 1.5,
    },

    disabledAction: {
        opacity: 0.55,
    },

    dateAction: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
    },

    dateActionText: {
        flexShrink: 1,
        fontFamily: "Satoshi-Medium",
        textTransform: "capitalize",
    },

    datePickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.28)",
        justifyContent: "flex-end",
        paddingHorizontal: 14,
        paddingBottom: 22,
    },

    datePickerSheet: {
        borderRadius: 28,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 12,
    },

    datePickerDone: {
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },

});
