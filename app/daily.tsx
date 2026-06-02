import PopUpContainer from "@/components/popUpContainer";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SquircleButton } from "expo-squircle-view";
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Keyboard, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import CreateModal from '../components/createModal';
import PrimaryButton from '../components/primaryButton';
import { TaskItem } from '../components/TaskItem';
import { toAppDateKey } from '../lib/date';
import { useFont } from "../lib/FontContext";
import { useAppTranslation } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { finalizeDailyReview } from '../lib/tasks';
import { useOptimisticOverdueTaskMutations } from '../lib/useOptimisticTaskMutations';
import { useToggleTaskDone } from '../lib/useToggleTaskDone';

const screenWidth = Dimensions.get('window').width;

type DailyTask = {
    id: number;
    name: string;
    description: string;
    done: boolean;
    order: number;
    date: string;
    completed_at?: string | null;
    resolved_at?: string | null;
    resolution?: string | null;
    carried_from_id?: number | null;
    delay_count?: number | null;
};

export default function DailyScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const todayString = toAppDateKey(new Date());
    const taskToggleQueryKeys = useMemo(() => [["tasks"]], []);
    const {
        isTaskPending: isPastTaskPending,
    } = useToggleTaskDone({
        queryKeys: taskToggleQueryKeys,
        errorTitle: t("common.alerts.errorTitle"),
        errorMessage: t("common.alerts.genericError"),
    });
    const {
        isTaskPending: isTodayTaskPending,
        toggleTaskDone: toggleTodayTaskDone,
    } = useToggleTaskDone({
        queryKeys: taskToggleQueryKeys,
        errorTitle: t("common.alerts.errorTitle"),
        errorMessage: t("common.alerts.genericError"),
    });
    const {
        isOverdueTaskPending,
        resolveOverdueTaskOptimistically,
    } = useOptimisticOverdueTaskMutations();

    const getTasks = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return [];
        }

        const { data, error } = await supabase
            .from('Tasks')
            .select('id, name, description, done, order, date, completed_at, resolved_at, resolution, carried_from_id, delay_count')
            .eq('user_id', user.id)
            .order("order", { ascending: false });

        if (error) {
            console.error('Erreur lors de la récupération des tâches:', error);
            return [];
        }
        return data ?? [];
    }

    const taskQuery = useQuery({
        queryKey: ['tasks'],
        queryFn: getTasks,
        gcTime: 1000 * 60 * 30,
        staleTime: 1000 * 60 * 15,
    });

    const pastTasks = useMemo(() => {
        return ((taskQuery.data ?? []) as DailyTask[])
            .filter((task) => task.date && toAppDateKey(task.date) < todayString && !task.done && !task.resolved_at)
            .sort((a, b) => {
                const dateCompare = toAppDateKey(b.date).localeCompare(toAppDateKey(a.date));
                return dateCompare === 0 ? (b.order || 0) - (a.order || 0) : dateCompare;
            });
    }, [taskQuery.data, todayString]);

    const todayTasks = useMemo(() => {
        return ((taskQuery.data ?? []) as DailyTask[])
            .filter((task) => task.date && toAppDateKey(task.date) === todayString && !task.resolved_at)
            .sort((a, b) => (b.order || 0) - (a.order || 0));
    }, [taskQuery.data, todayString]);

    const step1X = useSharedValue(0);
    const step2X = useSharedValue(screenWidth);
    const step3X = useSharedValue(screenWidth * 2);

    const [showReposModal, setShowReposModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Pseudo
                const { data: profile } = await supabase.from('Profiles').select('name').eq('id', user.id).single();
                if (profile && profile.name) {
                    setUserName(profile.name);
                } else {
                    setUserName(user.user_metadata?.name || t("daily.fallbackUser"));
                }
            }
        };
        fetchData();
    }, [t]);

    const handleTogglePastTask = async (taskId: number, currentDone: boolean) => {
        if (currentDone) {
            return;
        }

        const task = pastTasks.find((pastTask) => pastTask.id === taskId);
        void resolveOverdueTaskOptimistically(taskId, "late_completed", task).catch((error: any) => {
            console.error("Erreur lors de la complétion en retard:", error);
        });
    };

    const handleToggleTodayTask = async (taskId: number, currentDone: boolean) => {
        void toggleTodayTaskDone(taskId, currentDone);
    };

    const finishDaily = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await finalizeDailyReview(todayString);

                const { error } = await supabase
                    .from('Profiles')
                    .update({ hasDoneDaily: true })
                    .eq('id', user.id);

                if (error) {
                    console.error("Erreur lors de la mise à jour de hasDoneDaily:", error);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/home');
            }
        }
    };

    const goToStep2 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        step1X.value = withSpring(-screenWidth);
        step2X.value = withSpring(0);
        setCurrentStep(2);
    };

    const goToStep3 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        step2X.value = withSpring(-screenWidth);
        step3X.value = withSpring(0);
        setCurrentStep(3);
    };

    const goBackToStep1 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        step1X.value = withSpring(0);
        step2X.value = withSpring(screenWidth);
        setCurrentStep(1);
    };

    const goBackToStep2 = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        step2X.value = withSpring(0);
        step3X.value = withSpring(screenWidth);
        setCurrentStep(2);
    };

    const openAddTask = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsCreateModalOpen(!isCreateModalOpen);
    };

    const step1Style = useAnimatedStyle(() => ({ transform: [{ translateX: step1X.value }] }));
    const step2Style = useAnimatedStyle(() => ({ transform: [{ translateX: step2X.value }] }));
    const step3Style = useAnimatedStyle(() => ({ transform: [{ translateX: step3X.value }] }));

    const handleRestMode = async () => {
        // setShowReposModal(false);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('Profiles')
                    .update({ restMode: true, restEndDate: tomorrow })
                    .eq('id', user.id);

                if (error) {
                    console.error("Erreur lors de la mise à jour de hasDoneDaily:", error);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setShowReposModal(false);
            router.push('/rest');
        }
    }


    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Dots Indicator */}
            <View style={styles.dotsContainer}>
                {[1, 2, 3].map(step => (
                    <View key={step} style={[styles.dot, { backgroundColor: currentStep === step ? colors.text : colors.textSecondary || '#C4C4C4' }]} />
                ))}
            </View>

            {/* STEP 1 */}
            <Animated.View style={[styles.screen, step1Style]}>
                <View style={styles.contentContainer}>
                    <View style={styles.textCenter}>
                        <Text style={[styles.mainTitle, { color: colors.text }]}>{t("daily.morning")}</Text>
                        <Text style={[styles.name, { color: colors.textSecondary }]}>{userName}</Text>
                    </View>

                    <Image source={require('../assets/images/character/2.png')} style={styles.heroImage} resizeMode="contain" />

                    <Text style={[styles.question, { color: colors.textSecondary }]}>{t("daily.readyQuestion")}</Text>
                </View>

                <View style={styles.buttonsContainer}>
                    <PrimaryButton title={t("daily.ready")} onPress={goToStep2} />
                    <View style={{ height: 12 }} />
                    <View
                        style={{
                            width: '80%',
                            alignSelf: 'center',
                        }}
                    >

                        <PrimaryButton title={t("daily.rest")} type="reverse" onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowReposModal(true);
                        }} />
                    </View>
                </View>
            </Animated.View>

            {/* STEP 2 */}
            <Animated.View style={[styles.screen, step2Style]}>
                <View style={styles.contentContainerLeft}>
                    <Text style={[styles.mainTitle, { color: colors.text, marginBottom: 20, textAlign: 'center', width: '100%' }]}>{t("daily.great")}</Text>
                    <Text style={[styles.subtitleLeft, { color: colors.textSecondary }]}>
                        {t("daily.yesterdayIntro", {
                            tasksLabel: pastTasks.length > 0
                                ? t("daily.suspendedTasks")
                                : t("daily.noSuspendedTasks")
                        })}
                    </Text>

                    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                        {pastTasks.map(task => (
                            <View key={task.id}
                                style={{
                                    marginBottom: 8,
                                }}
                            >
                                <TaskItem
                                    item={task}
                                    drag={() => { }}
                                    isActive={false}
                                    handleToggleTask={handleTogglePastTask}
                                    handleTaskPress={() => { }}
                                    isTogglePending={isPastTaskPending(task.id) || isOverdueTaskPending(task.id)}
                                    selectedTaskId={null}
                                    listHeight={400}
                                    isExtendable={false}
                                    mode="daily"
                                    onDeleteTask={(item) => resolveOverdueTaskOptimistically(item.id, "deleted", item)}
                                    onMoveTask={(item, targetDateKey) => resolveOverdueTaskOptimistically(item.id, "postponed", item, targetDateKey)}
                                />
                            </View>
                        ))}
                        {pastTasks.length === 0 && (
                            <Text style={{ color: colors.textSecondary, marginTop: 20, textAlign: 'center' }}>{t("daily.nothingToReport")}</Text>
                        )}
                    </ScrollView>
                </View>

                <View style={styles.buttonsContainer}>
                    <PrimaryButton title={t("daily.goodToGo")} onPress={goToStep3} />
                    <View style={{ height: 12 }} />
                    <View
                        style={{
                            width: '80%',
                            alignSelf: 'center',
                        }}
                    >
                        <PrimaryButton title={t("common.actions.back")} type="reverse" onPress={goBackToStep1} />
                    </View>
                </View>
            </Animated.View>

            {/* STEP 3 */}
            <Animated.View style={[styles.screen, step3Style]}>
                <View style={styles.contentContainerLeft}>
                    <Text style={[styles.mainTitle, { color: colors.text, marginBottom: 20, textAlign: 'center', width: '100%' }]}>{t("daily.noted")}</Text>
                    <Text style={[styles.subtitleLeft, { color: colors.textSecondary }]}>
                        {t("daily.todayTasksIntro", { count: todayTasks.length })}
                    </Text>

                    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                        {todayTasks.map(task => (
                            <View key={task.id}
                                style={{
                                    marginBottom: 8,
                                }}
                            >
                                <TaskItem
                                    item={task}
                                    drag={() => { }}
                                    isActive={false}
                                    handleToggleTask={handleToggleTodayTask}
                                    handleTaskPress={() => { }}
                                    isTogglePending={isTodayTaskPending(task.id)}
                                    selectedTaskId={null}
                                    listHeight={400}
                                    isExtendable={false}
                                    mode="normal"
                                />
                            </View>
                        ))}
                        <SquircleButton
                            style={[styles.plusButton]}
                            onPress={openAddTask}
                        >
                            <Text style={styles.plusButtonText}>+</Text>
                        </SquircleButton>
                    </ScrollView>
                </View>

                <View style={styles.buttonsContainer}>
                    <PrimaryButton title={t("daily.letsGo")} onPress={finishDaily} />
                    <View style={{ height: 12 }} />
                    <View
                        style={{
                            width: '80%',
                            alignSelf: 'center',
                        }}
                    >
                        <PrimaryButton title={t("common.actions.back")} type="reverse" onPress={goBackToStep2} />
                    </View>
                </View>
            </Animated.View>

            {isCreateModalOpen && (
                <CreateModal
                    onClose={() => setIsCreateModalOpen(false)}
                />
            )}

            <PopUpContainer
                isVisible={showReposModal}
                onClose={() => setShowReposModal(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ overflow: 'hidden', height: 420, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                        <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                            <Image
                                source={require('@/assets/images/character/19.png')}
                                style={{ width: 120, height: 120 }}
                                resizeMode="contain"
                            />
                            <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['3xl'], textAlign: 'center' }}>
                                {t("settings.root.restModalTitle")}
                            </Text>

                            <Text
                                style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                            >
                                {t("settings.root.restModalDescription")}
                            </Text>

                        </View>

                        <View
                            style={{
                                width: '80%',
                                alignSelf: 'center',
                                gap: 8,
                            }}
                        >

                            <PrimaryButton
                                title={t("common.actions.confirm")}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleRestMode();
                                }}
                            />
                            <View
                                style={{
                                    width: '80%',
                                    alignSelf: 'center',
                                }}
                            >
                                <PrimaryButton title={t("common.actions.cancel")} type="reverse" onPress={() => setShowReposModal(false)} />
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </PopUpContainer>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        zIndex: 10,
        paddingTop: 60,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    screen: {
        position: 'absolute',
        top: 100,
        left: 0,
        width: screenWidth,
        height: Dimensions.get('window').height - 100,
        // paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'space-between',
        overflow: 'visible',
    },
    contentContainer: {
        alignItems: 'center',
        flex: 1,
        marginTop: 40,
        paddingHorizontal: 24,
    },
    contentContainerLeft: {
        alignItems: 'flex-start',
        flex: 1,
        marginTop: 20,
    },
    textCenter: {
        alignItems: 'center',
    },
    mainTitle: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 48,
    },
    name: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 24,
        marginTop: 4,
    },
    heroImage: {
        width: 220,
        height: 220,
        marginVertical: 40,
    },
    question: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 24,
    },
    subtitleLeft: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 24,
        marginBottom: 15,
        lineHeight: 26,
        paddingHorizontal: 24,
    },
    listContainer: {
        width: '100%',
        paddingHorizontal: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    fakeTask: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    fakeTaskText: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 14,
    },
    fakeTaskCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    plusButton: {
        alignSelf: 'center',
        width: 60,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: '#CECECE',
    },
    plusButtonText: {
        color: 'white',
        fontSize: 22,
    },
    buttonsContainer: {
        width: '100%',
        paddingBottom: 20,
        paddingHorizontal: 24,
    }
});
