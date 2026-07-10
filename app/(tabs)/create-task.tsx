import DateInput from "@/components/dateInput";
import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SimpleInput from "@/components/textInput";
import TagSelector from "@/components/TagSelector";
import { useStore } from "@/store/store";
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { isPastAppDateKey, toAppDateKey } from "@/lib/date";
import { taskEmitter } from "@/lib/eventEmitter";
import { useAppTranslation } from "@/lib/i18n";
import { useProfile } from "@/lib/profile";
import { useSubscription } from "@/lib/subscription";
import { useTheme } from "@/lib/ThemeContext";
import { useOptimisticTaskMutations } from "@/lib/useOptimisticTaskMutations";

export default function CreateTask() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [createInBox, setCreateInBox] = useState(false);
    const selectedDate = useStore((state) => state.selectedDate) || new Date();
    const setSelectedDate = useStore((state) => state.setSelectedDate);
    const { colors } = useTheme();
    const { t } = useAppTranslation();
    const { createTaskOptimistically, isCreatingTask } = useOptimisticTaskMutations();
    const { canUseTaskBox } = useSubscription();
    const profileQuery = useProfile();
    const selectedDateKey = toAppDateKey(selectedDate);
    const lockPastDaysEnabled = profileQuery.data?.lockPastDaysEnabled ?? true;
    const isSelectedDatePast = lockPastDaysEnabled && isPastAppDateKey(selectedDateKey);

    const leaveCreateTask = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/home");
        }
    };

    const handleCreateTask = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!name.trim()) {
            Alert.alert(t("common.alerts.errorTitle"), t("common.alerts.requiredTaskName"));
            return;
        }

        if (!createInBox && isSelectedDatePast) {
            Alert.alert(t("common.alerts.errorTitle"), t("createTask.alerts.pastDate"));
            return;
        }

        if (createInBox && !canUseTaskBox) {
            router.push("/settings/premium");
            return;
        }

        const nextTask = {
            name,
            description,
            dateKey: createInBox ? null : selectedDateKey,
            tagIds: selectedTagIds,
        };

        setName("");
        setDescription("");
        setSelectedTagIds([]);
        setCreateInBox(false);
        taskEmitter.emit("taskAdded");
        leaveCreateTask();

        void createTaskOptimistically(nextTask).catch((error: any) => {
            console.error("Erreur lors de la création de la tâche:", error);
            Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
        });
    };

    const handleCancel = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        leaveCreateTask();
    }

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    const handleBoxToggle = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!canUseTaskBox) {
            router.push("/settings/premium");
            return;
        }

        setCreateInBox((current) => !current);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
            </View>
            <Headline title={t("createTask.headline.title")} subtitle={t("createTask.headline.subtitle")} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainView}>

                    <SimpleInput
                        name={t("createTask.fields.title")}
                        value={name}
                        onChangeText={setName}
                        bold
                    />

                    <SimpleInput
                        name={t("createTask.fields.description")}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        bold
                    />

                    <TagSelector
                        selectedTagIds={selectedTagIds}
                        onChange={setSelectedTagIds}
                    />

                    <Pressable
                        onPress={handleBoxToggle}
                        style={({ pressed }) => [
                            styles.boxToggle,
                            {
                                backgroundColor: createInBox ? colors.text : colors.task,
                                borderColor: !canUseTaskBox ? "#F4BA00" : createInBox ? colors.text : colors.border,
                                opacity: pressed || isCreatingTask ? 0.75 : 1,
                            },
                        ]}
                        disabled={isCreatingTask}
                    >
                        <Text style={[styles.boxToggleText, { color: createInBox ? colors.background : colors.text }]}>
                            {createInBox ? t("createTask.fields.taskBoxSelected") : t("createTask.fields.taskBox")}
                        </Text>
                    </Pressable>

                    {!createInBox ? (
                        <DateInput
                            value={selectedDate}
                            onChange={handleDateChange}
                            disabled={isCreatingTask}
                            bold
                            showTodayButton
                            minimumDate={lockPastDaysEnabled ? new Date() : undefined}
                            minimumDateAlertMessage={t("createTask.alerts.pastDate")}
                        />
                    ) : null}

                </View>
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignSelf: "center", width: "100%", position: "absolute", bottom: 23 }}>
                <PrimaryButton size="XS" image="xmark" onPress={handleCancel} />
                <PrimaryButton size="M" title={t("createTask.buttons.confirm")} onPress={handleCreateTask} disabled={isCreatingTask || (!createInBox && isSelectedDatePast)} />
            </View>

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 23,
        paddingBottom: 23,
        paddingTop: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
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

    subtitle: {
        fontSize: 26,
        marginLeft: 5,
        marginTop: -10,
        fontFamily: 'Satoshi-Regular',
        opacity: 0.7,
    },

    scrollContent: {
        marginTop: 50,
    },

    mainView: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
    },

    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
    },
    descriptionContainer: {
        marginBottom: 30,
    },
    optionalText: {
        fontStyle: "italic",
    },
    descriptionInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: "top",
    },
    createButton: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        height: 70,
        width: "70%",
        borderRadius: 100,
        position: "absolute",
        bottom: 30,
        right: 30,
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        fontSize: 20,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
    backButton: {
        alignItems: "center",
        justifyContent: "center",
        height: 70,
        width: 70,
        borderRadius: 100,
        position: "absolute",
        bottom: 30,
        left: 30,
    },
    dateContainer: {
        marginBottom: 30,
    },
    boxToggle: {
        alignItems: "center",
        borderRadius: 15,
        borderWidth: 1,
        minHeight: 56,
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    boxToggleText: {
        fontFamily: "Satoshi-Medium",
        fontSize: 17,
    },
    dateButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    dateButtonText: {
        fontSize: 16,
        fontWeight: "500",
        textTransform: "capitalize",
    },

});
