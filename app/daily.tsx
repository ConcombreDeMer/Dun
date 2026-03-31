import PopUpContainer from "@/components/popUpContainer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import CreateModal from '../components/createModal';
import PrimaryButton from '../components/primaryButton';
import { TaskItem } from '../components/TaskItem';
import { useFont } from "../lib/FontContext";
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

const screenWidth = Dimensions.get('window').width;

export default function DailyScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { fontSizes } = useFont();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [pastTasks, setPastTasks] = useState<any[]>([]);
    const [todayTasks, setTodayTasks] = useState<any[]>([]);

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
                    setUserName(user.user_metadata?.name || 'User');
                }

                // Tâches
                const todayString = new Date().toISOString().split('T')[0];

                // Tâches passées non complétées
                const { data: pastData } = await supabase
                    .from('Tasks')
                    .select('id, name, description, done, order, date')
                    .lt('date', todayString)
                    .eq('done', false)
                    .order('date', { ascending: false });

                if (pastData) setPastTasks(pastData);
            }
        };
        fetchData();
    }, []);

    const todayString = new Date().toISOString().split('T')[0];

    const getTodayTasks = async () => {
        const { data, error } = await supabase
            .from('Tasks')
            .select('id, name, description, done, order, date')
            .eq('date', todayString)
            .order("order", { ascending: false });

        if (error) {
            console.error('Erreur lors de la récupération des tâches:', error);
            return [];
        }
        return data;
    }

    const todayTasksQuery = useQuery({
        queryKey: ['tasks', todayString],
        queryFn: getTodayTasks,
        gcTime: 1000 * 60 * 5,
        staleTime: 1000 * 60 * 2,
    });

    const handleTogglePastTask = async (taskId: number, currentDone: boolean) => {
        setPastTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !currentDone } : t));
        await supabase.from('Tasks').update({ done: !currentDone }).eq('id', taskId);
    };

    const handleToggleTodayTask = async (taskId: number, currentDone: boolean) => {
        const previousTasks = queryClient.getQueryData<any[]>(['tasks', todayString]);

        queryClient.setQueryData(
            ['tasks', todayString],
            previousTasks?.map(task =>
                task.id === taskId ? { ...task, done: !currentDone } : task
            ) || []
        );

        const { error } = await supabase.from('Tasks').update({ done: !currentDone }).eq('id', taskId);

        if (error) {
            queryClient.setQueryData(['tasks', todayString], previousTasks || []);
        } else {
            queryClient.invalidateQueries({ queryKey: ['tasks', todayString] });
        }
    };

    const finishDaily = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
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
                router.replace('/');
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
        setShowReposModal(false);
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
            router.replace('/rest');
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
                        <Text style={[styles.mainTitle, { color: colors.text }]}>Good morning</Text>
                        <Text style={[styles.name, { color: colors.textSecondary }]}>{userName}</Text>
                    </View>

                    <Image source={require('../assets/images/character/2.png')} style={styles.heroImage} resizeMode="contain" />

                    <Text style={[styles.question, { color: colors.textSecondary }]}>Prêt à <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.textSecondary }}>préparer</Text> ta journée ?</Text>
                </View>

                <View style={styles.buttonsContainer}>
                    <PrimaryButton title="J'suis prêt !" onPress={goToStep2} />
                    <View style={{ height: 12 }} />
                    <View
                        style={{
                            width: '80%',
                            alignSelf: 'center',
                        }}
                    >

                        <PrimaryButton title="Repos" type="reverse" onPress={() => {
                            setShowReposModal(true);
                        }} />
                    </View>
                </View>
            </Animated.View>

            {/* STEP 2 */}
            <Animated.View style={[styles.screen, step2Style]}>
                <View style={styles.contentContainerLeft}>
                    <Text style={[styles.mainTitle, { color: colors.text, marginBottom: 20, textAlign: 'center', width: '100%' }]}>Super !</Text>
                    <Text style={[styles.subtitleLeft, { color: colors.textSecondary }]}>
                        Commençons par <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.text }}>hier</Text>,{'\n'}tu as laissé <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.text }}>{pastTasks.length > 0 ? "ces tâches" : "aucune tâche"}</Text> en{'\n'}suspens :
                    </Text>

                    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                        {pastTasks.map(task => (
                            <View key={task.id}>
                                <TaskItem
                                    item={task}
                                    drag={() => { }}
                                    isActive={false}
                                    handleToggleTask={handleTogglePastTask}
                                    handleTaskPress={() => { }}
                                    selectedTaskId={null}
                                    listHeight={400}
                                />
                            </View>
                        ))}
                        {pastTasks.length === 0 && (
                            <Text style={{ color: colors.textSecondary, marginTop: 20, textAlign: 'center' }}>Rien à signaler, beau travail 💪</Text>
                        )}
                    </ScrollView>
                </View>

                <View style={styles.buttonsContainer}>
                    <PrimaryButton title="On est bon !" onPress={goToStep3} />
                    <View style={{ height: 12 }} />
                    <View
                        style={{
                            width: '80%',
                            alignSelf: 'center',
                        }}
                    >
                        <PrimaryButton title="Retour" type="reverse" onPress={goBackToStep1} />
                    </View>
                </View>
            </Animated.View>

            {/* STEP 3 */}
            <Animated.View style={[styles.screen, step3Style]}>
                <View style={styles.contentContainerLeft}>
                    <Text style={[styles.mainTitle, { color: colors.text, marginBottom: 20, textAlign: 'center', width: '100%' }]}>C'est noté !</Text>
                    <Text style={[styles.subtitleLeft, { color: colors.textSecondary }]}>
                        Tu as donc <Text style={{ fontFamily: 'Satoshi-Bold', color: colors.text }}>{todayTasksQuery.data ? todayTasksQuery.data.length : 0} tâches</Text>{'\n'}à compléter aujourd'hui :
                    </Text>

                    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                        {todayTasksQuery.data?.map(task => (
                            <View key={task.id}>
                                <TaskItem
                                    item={task}
                                    drag={() => { }}
                                    isActive={false}
                                    handleToggleTask={handleToggleTodayTask}
                                    handleTaskPress={() => { }}
                                    selectedTaskId={null}
                                    listHeight={400}
                                />
                            </View>
                        ))}
                        <Pressable
                            style={[styles.plusButton, { backgroundColor: colors.border || '#C4C4C4' }]}
                            onPress={openAddTask}
                        >
                            <Text style={styles.plusButtonText}>+</Text>
                        </Pressable>
                    </ScrollView>
                </View>

                <View style={styles.buttonsContainer}>
                    <PrimaryButton title="Let's go" onPress={finishDaily} />
                    <View style={{ height: 12 }} />
                    <View
                        style={{
                            width: '80%',
                            alignSelf: 'center',
                        }}
                    >
                        <PrimaryButton title="Retour" type="reverse" onPress={goBackToStep2} />
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
                children={
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ overflow: 'hidden', height: 420, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                                <Image
                                    source={require('@/assets/images/character/19.png')}
                                    style={{ width: 120, height: 120 }}
                                    resizeMode="contain"
                                />
                                <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['3xl'], textAlign: 'center' }}>
                                    Aujourd'hui c'est <Text style={{ fontFamily: 'Satoshi-Bold' }}>repos</Text> !
                                </Text>

                                <Text
                                    style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                                >
                                    Cette journée ne sera pas
                                    répertoriée dans les statistiques
                                    et tes tâches en suspens sont
                                    reportées à ta prochaine journée active
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
                                    title="Confirmer"
                                    onPress={() => {
                                        handleRestMode();
                                    }}
                                />
                                <View
                                    style={{
                                        width: '80%',
                                        alignSelf: 'center',
                                    }}
                                >
                                    <PrimaryButton title="Annuler" type="reverse" onPress={() => setShowReposModal(false)} />
                                </View>
                            </View>

                        </View>
                    </TouchableWithoutFeedback>
                }
            />

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        zIndex: 10,
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