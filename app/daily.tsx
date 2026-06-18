import DailyCircle from '@/components/dailyCircle';
import ExtendedButton from '@/components/extendedButton';
import PrimaryButton from '@/components/primaryButton';
import { TaskItem } from '@/components/TaskItem';
import { completeDailyReview, deleteDailyPendingTask, getDailyData, postponeDailyPendingTask, setDailyPendingTaskDone, type DailyData, type DailyPendingTask } from '@/lib/daily';
import { useFont } from '@/lib/FontContext';
import { useAppTranslation } from '@/lib/i18n';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SquircleView } from 'expo-squircle-view';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    FadeOut,
    FadeOutDown,
    FadeOutLeft,
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';

const subIntroTextReappearDelay = 180;
const introTextReappearDelay = 180;
const imageContainerSize = 200;
const imageContainerExpandedSize = 150;
const centralProgressEntranceDelay = 500;
const centralProgressFillDelay = 920;
const centralProgressFillDuration = 1280;
const streakTransitionDelay = centralProgressFillDelay + centralProgressFillDuration + 500;
const streakScaleLeadDelay = 500;
const dailyCircleFirstEntranceDelay = 200;
const dailyCircleEntranceDelayStep = 20;
const supportContentEntranceDelay = centralProgressEntranceDelay;
const pendingTaskEstimatedHeight = 64;
const pendingTaskGap = 10;
const step3PanelFixedHeight = 20 + 18 + 30 + 18 + 12 + 48;
const step3EmptyStateHeight = 150;
const step3ContentEntranceDelay = 400;
const step3ContentEntranceDelayStep = 20;
const step4SliderHandleWidth = 72;
const step4SliderHorizontalInset = 4;
const step4SliderCompletionThreshold = 0.86;
const stepButtonReleaseDelay = 180;

const wait = (duration: number) => new Promise((resolve) => {
    setTimeout(resolve, duration);
});

const alphaColor = (color: string, opacity: number) => {
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const normalizedHex = hex.length >= 6 ? hex.slice(0, 6) : hex;
        const numericColor = Number.parseInt(normalizedHex, 16);

        if (!Number.isNaN(numericColor)) {
            const red = (numericColor >> 16) & 255;
            const green = (numericColor >> 8) & 255;
            const blue = numericColor & 255;
            return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
        }
    }

    return color;
};

const getStreakIconSource = (streak: number) => {
    if (streak === 0) {
        return require('@/assets/images/stats/streak/low.png');
    }

    if (streak <= 4) {
        return require('@/assets/images/stats/streak/medium.png');
    }

    return require('@/assets/images/stats/streak/high.png');
};

const getStreakIconKey = (streak: number) => {
    if (streak === 0) {
        return 'low';
    }

    if (streak <= 4) {
        return 'medium';
    }

    return 'high';
};

export default function DailyScreen() {
    const { colors, actualTheme } = useTheme();
    const { t, language } = useAppTranslation();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { width: windowWidth } = useWindowDimensions();
    const [currentStep, setCurrentStep] = useState(1);
    const [isExtendedButtonExpanded, setIsExtendedButtonExpanded] = useState(false);
    const [step2ExitDirection, setStep2ExitDirection] = useState<'previous' | 'next'>('next');
    const [displayedCompletionPercent, setDisplayedCompletionPercent] = useState(0);
    const [displayedStreak, setDisplayedStreak] = useState(0);
    const [dailyData, setDailyData] = useState<DailyData | null>(null);
    const [isDailyLoading, setIsDailyLoading] = useState(true);
    const [dailyError, setDailyError] = useState<string | null>(null);
    const [isCompletingDaily, setIsCompletingDaily] = useState(false);
    const [pendingTasks, setPendingTasks] = useState<DailyPendingTask[]>([]);
    const [pendingToggleTaskIds, setPendingToggleTaskIds] = useState<Set<number>>(() => new Set());
    const [pendingDailyMutationCount, setPendingDailyMutationCount] = useState(0);
    const pendingDailyMutationsRef = useRef<Set<Promise<void>>>(new Set());
    const today = useMemo(() => new Date(), []);
    const moonButtonOpacity = useSharedValue(1);
    const moonButtonScale = useSharedValue(1);
    const moonButtonWidth = useSharedValue(64);
    const introTextOpacity = useSharedValue(1);
    const introTextTranslateY = useSharedValue(0);
    const subIntroTextOpacity = useSharedValue(1);
    const subIntroTextTranslateY = useSharedValue(0);
    const animatedImageContainerSize = useSharedValue(imageContainerSize);
    const character20Opacity = useSharedValue(0);
    const character21Opacity = useSharedValue(1);
    const animatedPreviousDayProgress = useSharedValue(0);
    const centralProgressScaleY = useSharedValue(1);
    const streakContainerScale = useSharedValue(1);
    const step4SliderTranslateX = useSharedValue(0);
    const step4SliderDragStartX = useSharedValue(0);
    const extendedButtonPressScale = useSharedValue(1);
    const step2NextButtonScale = useSharedValue(1);
    const step3DoneButtonScale = useSharedValue(1);
    const { fontSizes } = useFont();

    const dailyCompletionDays = dailyData?.completionDays ?? [];
    const previousDayCompletion = dailyData?.previousDayCompletion ?? { percent: 0, completedTasks: 0, totalTasks: 0 };
    const dailyStreak = dailyData?.streak ?? 0;
    const dailyMotivation = dailyData?.motivation ?? { titleKey: '', bodyKey: '' };
    const isStep4 = currentStep === 4;
    const dateLocale = language === 'fr' ? 'fr-FR' : 'en-US';
    const currentWeekday = useMemo(
        () => new Intl.DateTimeFormat(dateLocale, { weekday: 'short' }).format(today).replace('.', '').toLowerCase(),
        [dateLocale, today]
    );
    const currentMonth = useMemo(
        () => new Intl.DateTimeFormat(dateLocale, { month: 'short' }).format(today).replace('.', '').toLowerCase(),
        [dateLocale, today]
    );
    const currentDayNumber = today.getDate();
    const isPreviousDayCompleted = previousDayCompletion.percent >= 100;
    const streakTargetValue = isPreviousDayCompleted ? dailyStreak + 1 : 0;
    const streakIconSource = getStreakIconSource(displayedStreak);
    const streakIconKey = getStreakIconKey(displayedStreak);
    const shouldAnimateStreakChange = displayedStreak !== dailyStreak;
    const panelBackgroundColor = actualTheme === 'light' ? colors.taskDone : colors.card;
    const panelTextColor = actualTheme === 'light' ? colors.background : colors.text;
    const panelTextMutedColor = alphaColor(panelTextColor, 0.58);
    const panelTextSoftColor = alphaColor(panelTextColor, 0.72);
    const panelSurfaceColor = colors.button;
    const panelActionTextColor = colors.text;
    const progressTrackColor = alphaColor(panelTextColor, 0.18);
    const progressFillColor = colors.doneSecondary ?? colors.checkboxDone;
    const streakTextColor = displayedStreak > 0 ? (colors.doneSecondary ?? colors.text) : alphaColor(panelTextColor, 0.42);
    const introTitleColor = alphaColor(colors.text, 0.7);
    const introSubtitleColor = alphaColor(colors.text, 0.4);
    const dateLabelColor = alphaColor(colors.text, 0.28);
    const dateNumberColor = alphaColor(colors.text, 0.58);
    const sliderHandleColor = colors.button;
    const iconOnPanelColor = alphaColor(panelTextColor, 0.58);
    const pendingTaskListLayoutKey = useMemo(
        () => pendingTasks.map((task) => task.id).join('-'),
        [pendingTasks]
    );
    const hasPendingDailyMutations = pendingDailyMutationCount > 0;
    const steps = useMemo(
        () => Array.from({ length: 4 }, (_, index) => index + 1),
        []
    );

    const removePendingTask = useCallback((task: { id: number }) => {
        setPendingTasks((tasks) => tasks.filter((candidate) => candidate.id !== task.id));
    }, []);

    const refreshDailyData = useCallback(async (syncPendingTasks = false) => {
        const nextDailyData = await getDailyData();
        setDailyData(nextDailyData);
        setDisplayedStreak(nextDailyData.streak);

        if (syncPendingTasks) {
            setPendingTasks(nextDailyData.pendingTasks);
        }
    }, []);

    const runDailyMutation = useCallback(async (mutation: () => Promise<void>) => {
        setPendingDailyMutationCount((count) => count + 1);
        const mutationPromise = mutation();
        pendingDailyMutationsRef.current.add(mutationPromise);

        try {
            await mutationPromise;
        } finally {
            pendingDailyMutationsRef.current.delete(mutationPromise);
            setPendingDailyMutationCount((count) => Math.max(0, count - 1));
        }
    }, []);

    const waitForPendingDailyMutations = useCallback(async () => {
        while (pendingDailyMutationsRef.current.size > 0) {
            await Promise.all(Array.from(pendingDailyMutationsRef.current));
        }
    }, []);

    const handleDeletePendingTask = useCallback(async (task: { id: number }) => {
        await runDailyMutation(async () => {
            await deleteDailyPendingTask(task.id);
            removePendingTask(task);
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            await queryClient.invalidateQueries({ queryKey: ['days'] });
            await refreshDailyData(true);
        });
    }, [queryClient, refreshDailyData, removePendingTask, runDailyMutation]);

    const handlePostponePendingTask = useCallback(async (task: { id: number }, targetDateKey: string) => {
        await runDailyMutation(async () => {
            await postponeDailyPendingTask(task.id, targetDateKey);
            removePendingTask(task);
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            await queryClient.invalidateQueries({ queryKey: ['days'] });
            await refreshDailyData(true);
        });
    }, [queryClient, refreshDailyData, removePendingTask, runDailyMutation]);

    const handleTogglePendingTask = useCallback((taskId: number, currentDone: boolean) => {
        const nextDone = !currentDone;

        setPendingToggleTaskIds((current) => {
            const next = new Set(current);
            next.add(taskId);
            return next;
        });
        setPendingTasks((tasks) => tasks.map((task) =>
            task.id === taskId ? { ...task, done: nextDone } : task
        ));

        void runDailyMutation(async () => {
            await setDailyPendingTaskDone(taskId, nextDone);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tasks'] }),
                queryClient.invalidateQueries({ queryKey: ['days'] }),
            ]);
            await refreshDailyData(false);
        })
            .catch((error) => {
                console.error('Erreur lors de la mise à jour de la tâche daily:', error);
                setPendingTasks((tasks) => tasks.map((task) =>
                    task.id === taskId ? { ...task, done: currentDone } : task
                ));
                Alert.alert(t('common.alerts.errorTitle'), t('daily.updateTaskError'));
            })
            .finally(() => {
                setPendingToggleTaskIds((current) => {
                    const next = new Set(current);
                    next.delete(taskId);
                    return next;
                });
            });
    }, [queryClient, refreshDailyData, runDailyMutation, t]);

    const closeDailyRoute = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace('/home');
    }, [router]);

    const completeDailyAndExit = useCallback(async () => {
        setIsCompletingDaily(true);

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await completeDailyReview();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tasks'] }),
                queryClient.invalidateQueries({ queryKey: ['days'] }),
            ]);
            closeDailyRoute();
        } catch (error) {
            console.error('Erreur lors de la finalisation du daily:', error);
            setIsCompletingDaily(false);
            Alert.alert(t('common.alerts.errorTitle'), t('daily.prepareError'));
        }
    }, [closeDailyRoute, queryClient, t]);

    useEffect(() => {
        let isMounted = true;

        const loadDailyData = async () => {
            try {
                setIsDailyLoading(true);
                setDailyError(null);
                const nextDailyData = await getDailyData();

                if (!isMounted) {
                    return;
                }

                setDailyData(nextDailyData);
                setPendingTasks(nextDailyData.pendingTasks);
                setDisplayedStreak(nextDailyData.streak);
            } catch (error) {
                console.error('Erreur lors du chargement du daily:', error);

                if (isMounted) {
                    setDailyError(t('daily.loadError'));
                }
            } finally {
                if (isMounted) {
                    setIsDailyLoading(false);
                }
            }
        };

        void loadDailyData();

        return () => {
            isMounted = false;
        };
    }, [t]);

    const handleStep2DonePress = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await waitForPendingDailyMutations();
        await wait(stepButtonReleaseDelay);
        setCurrentStep((step) => step + 1);
    }, [waitForPendingDailyMutations]);

    const handleStep3NextPress = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await wait(stepButtonReleaseDelay);
        setStep2ExitDirection('next');
        setIsExtendedButtonExpanded(true);
        setCurrentStep((step) => step + 1);
    }, []);

    const goToNextStep = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (currentStep < steps.length) {
            setCurrentStep((step) => step + 1);
            return;
        }

        await completeDailyAndExit();
    };

    const goToPreviousStep = async () => {
        if (currentStep === 1) {
            return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (currentStep === 2) {
            setStep2ExitDirection('previous');
            setIsExtendedButtonExpanded(false);
        }
        if (currentStep === 3) {
            setStep2ExitDirection('previous');
            setIsExtendedButtonExpanded(true);
        }
        setCurrentStep((step) => step - 1);
    };

    const extendedButtonBaseWidth = (windowWidth * 0.9) - 8 - 64; // 90% of screen width minus gap
    const extendedButtonBaseHeight = 64;
    const extendedButtonWidth = isExtendedButtonExpanded ? windowWidth * 0.9 : extendedButtonBaseWidth;
    const step4SliderMaxTranslate = Math.max(0, extendedButtonWidth - step4SliderHandleWidth - step4SliderHorizontalInset * 2);
    const step3MaxHeight = extendedButtonBaseHeight + 400;
    const step3MaxListHeight = step3MaxHeight - step3PanelFixedHeight;
    const step3TaskListHeight = pendingTasks.length > 0
        ? pendingTasks.length * pendingTaskEstimatedHeight + Math.max(0, pendingTasks.length - 1) * pendingTaskGap
        : step3EmptyStateHeight;
    const shouldShowPendingTasksScrollIndicator = pendingTasks.length > 0 && step3TaskListHeight > step3MaxListHeight;
    const step3AdaptiveHeight = 12 + Math.min(
        step3MaxHeight,
        step3PanelFixedHeight + Math.min(step3TaskListHeight, step3MaxListHeight)
    );
    const extendedButtonExpandedHeight = currentStep === 2
        ? step3AdaptiveHeight
        : isStep4
            ? extendedButtonBaseHeight
            : extendedButtonBaseHeight + 350;
    const extendedButtonHeight = isExtendedButtonExpanded ? extendedButtonExpandedHeight : extendedButtonBaseHeight;
    const extendedButtonBorderRadius = currentStep === 3 ? 27 : currentStep === 2 ? 27 : 17;
    const step2ExitingAnimation = step2ExitDirection === 'next'
        ? FadeOutLeft.duration(180)
        : FadeOut.duration(120);
    const step4SliderGesture = Gesture.Pan()
        .enabled(isStep4)
        .onBegin(() => {
            step4SliderDragStartX.value = step4SliderTranslateX.value;
            extendedButtonPressScale.value = withTiming(1.05, { duration: 120 });
        })
        .onUpdate((event) => {
            const nextTranslateX = step4SliderDragStartX.value + event.translationX;
            step4SliderTranslateX.value = Math.min(Math.max(nextTranslateX, 0), step4SliderMaxTranslate);
        })
        .onFinalize(() => {
            const hasCompletedSlider = step4SliderTranslateX.value >= step4SliderMaxTranslate * step4SliderCompletionThreshold;

            if (hasCompletedSlider) {
                step4SliderTranslateX.value = withTiming(step4SliderMaxTranslate, { duration: 180 });
                extendedButtonPressScale.value = withTiming(1, { duration: 160 });
                runOnJS(completeDailyAndExit)();
                return;
            }

            step4SliderTranslateX.value = withSpring(0);
            extendedButtonPressScale.value = withTiming(1, { duration: 160 });
        });

    const toggleExtendedButtonSize = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (currentStep === 1) {
            setIsExtendedButtonExpanded(true);
            goToNextStep();
        }
    };

    const handleExtendedButtonPressIn = () => {
        if (currentStep === 1) {
            extendedButtonPressScale.value = withTiming(0.95, { duration: 120 });
        }
    };

    const handleExtendedButtonPressOut = () => {
        if (currentStep === 1) {
            extendedButtonPressScale.value = withTiming(1, { duration: 160 });
        }
    };

    const handleStep2NextPressIn = () => {
        step2NextButtonScale.value = withTiming(0.95, { duration: 120 });
    };

    const handleStep2NextPressOut = () => {
        step2NextButtonScale.value = withTiming(1, { duration: 160 });
    };

    const handleStep3DonePressIn = () => {
        step3DoneButtonScale.value = withTiming(0.95, { duration: 120 });
    };

    const handleStep3DonePressOut = () => {
        step3DoneButtonScale.value = withTiming(1, { duration: 160 });
    };

    useEffect(() => {
        moonButtonOpacity.value = withTiming(isExtendedButtonExpanded ? 0 : 1, { duration: 180 });
        moonButtonScale.value = withSpring(isExtendedButtonExpanded ? 0.72 : 1);
        moonButtonWidth.value = withSpring(isExtendedButtonExpanded ? 0 : 64);
        introTextOpacity.value = isExtendedButtonExpanded
            ? withTiming(0, { duration: 160 })
            : withDelay(introTextReappearDelay, withTiming(1, { duration: 460 }));
        introTextTranslateY.value = isExtendedButtonExpanded
            ? withTiming(-24, { duration: 160 })
            : withDelay(introTextReappearDelay, withTiming(0, { duration: 460 }));
        subIntroTextOpacity.value = isExtendedButtonExpanded
            ? withTiming(0, { duration: 160 })
            : withDelay(subIntroTextReappearDelay, withTiming(1, { duration: 460 }));
        subIntroTextTranslateY.value = isExtendedButtonExpanded
            ? withTiming(-24, { duration: 160 })
            : withDelay(subIntroTextReappearDelay, withTiming(0, { duration: 460 }));
        animatedImageContainerSize.value = withSpring(isExtendedButtonExpanded && !isStep4 ? imageContainerExpandedSize : imageContainerSize);
    }, [animatedImageContainerSize, introTextOpacity, introTextTranslateY, isExtendedButtonExpanded, isStep4, moonButtonOpacity, moonButtonScale, moonButtonWidth, subIntroTextOpacity, subIntroTextTranslateY]);

    useEffect(() => {
        const shouldShowCharacter21 = currentStep === 1 || isStep4;

        character21Opacity.value = withTiming(shouldShowCharacter21 ? 1 : 0, { duration: 120 });
        character20Opacity.value = withTiming(shouldShowCharacter21 ? 0 : 1, { duration: 120 });
    }, [character20Opacity, character21Opacity, currentStep, isStep4]);

    useEffect(() => {
        step4SliderTranslateX.value = withTiming(0, { duration: 180 });
    }, [currentStep, step4SliderTranslateX]);

    useEffect(() => {
        if (currentStep !== 3) {
            animatedPreviousDayProgress.value = 0;
            streakContainerScale.value = 1;
            setDisplayedCompletionPercent(0);
            setDisplayedStreak(dailyStreak);
            return;
        }

        animatedPreviousDayProgress.value = 0;
        centralProgressScaleY.value = 1;
        streakContainerScale.value = 1;
        setDisplayedCompletionPercent(0);
        setDisplayedStreak(dailyStreak);
        animatedPreviousDayProgress.value = withDelay(
            centralProgressFillDelay,
            withTiming(previousDayCompletion.percent, {
                duration: centralProgressFillDuration,
                easing: Easing.inOut(Easing.cubic),
            })
        );
        centralProgressScaleY.value = withDelay(
            centralProgressFillDelay,
            withSequence(
                withTiming(1.28, {
                    duration: centralProgressFillDuration * 0.45,
                    easing: Easing.out(Easing.cubic),
                }),
                withTiming(1, {
                    duration: centralProgressFillDuration * 0.55,
                    easing: Easing.inOut(Easing.cubic),
                })
            )
        );

        const streakScaleStartTimeout = setTimeout(() => {
            streakContainerScale.value = withSequence(
                withTiming(1.2, {
                    duration: streakScaleLeadDelay,
                    easing: Easing.inOut(Easing.cubic),
                }),
                withDelay(
                    500,
                    withTiming(1, {
                        duration: 500,
                        easing: Easing.inOut(Easing.cubic),
                    })
                )
            );
        }, streakTransitionDelay - streakScaleLeadDelay);

        const streakTransitionTimeout = setTimeout(() => {
            setDisplayedStreak(streakTargetValue);
        }, streakTransitionDelay);

        return () => {
            clearTimeout(streakScaleStartTimeout);
            clearTimeout(streakTransitionTimeout);
        };
    }, [animatedPreviousDayProgress, centralProgressScaleY, currentStep, dailyStreak, previousDayCompletion.percent, streakContainerScale, streakTargetValue]);

    useAnimatedReaction(
        () => Math.round(animatedPreviousDayProgress.value),
        (progress) => {
            runOnJS(setDisplayedCompletionPercent)(progress);
        }
    );

    const moonButtonAnimatedStyle = useAnimatedStyle(() => ({
        width: moonButtonWidth.value,
        opacity: moonButtonOpacity.value,
        transform: [{ scale: moonButtonScale.value }],
    }));

    const introTextAnimatedStyle = useAnimatedStyle(() => ({
        opacity: introTextOpacity.value,
        transform: [{ translateY: introTextTranslateY.value }],
    }));

    const subIntroTextAnimatedStyle = useAnimatedStyle(() => ({
        opacity: subIntroTextOpacity.value,
        transform: [{ translateY: subIntroTextTranslateY.value }],
    }));

    const imageContainerAnimatedStyle = useAnimatedStyle(() => ({
        width: animatedImageContainerSize.value,
        height: animatedImageContainerSize.value,
    }));

    const character20AnimatedStyle = useAnimatedStyle(() => ({
        opacity: character20Opacity.value,
    }));

    const character21AnimatedStyle = useAnimatedStyle(() => ({
        opacity: character21Opacity.value,
    }));

    const centralProgressFillAnimatedStyle = useAnimatedStyle(() => ({
        width: `${animatedPreviousDayProgress.value}%` as DimensionValue,
        transform: [{ scaleY: centralProgressScaleY.value }],
    }));

    const streakContainerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: streakContainerScale.value }],
    }));

    const extendedButtonPressAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: extendedButtonPressScale.value }],
    }));

    const step2NextButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: step2NextButtonScale.value }],
    }));

    const step3DoneButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: step3DoneButtonScale.value }],
    }));

    const step4SliderHandleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: step4SliderTranslateX.value }],
    }));

    const step4SliderTextAnimatedStyle = useAnimatedStyle(() => {
        const sliderProgress = step4SliderMaxTranslate > 0
            ? Math.min(Math.max(step4SliderTranslateX.value / step4SliderMaxTranslate, 0), 1)
            : 0;

        return {
            opacity: interpolate(sliderProgress, [0, 0.4], [1, 0], 'clamp'),
            transform: [{ translateX: interpolate(sliderProgress, [0, 0.4], [0, -28], 'clamp') }],
        };
    });

    if (isDailyLoading || isCompletingDaily || dailyError || !dailyData) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
                {!dailyError && (
                    <ActivityIndicator color={colors.text} size="small" />
                )}
                <Text style={[styles.loadingText, { color: colors.text, fontSize: fontSizes.lg }]}>
                    {dailyError ?? (isCompletingDaily ? t('daily.preparing') : t('daily.loading'))}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.dotsContainer}>
                {steps.map((step) => (
                    <View
                        key={step}
                        style={[
                            styles.dot,
                            { backgroundColor: currentStep === step ? colors.text : colors.textSecondary },
                        ]}
                    />
                ))}
            </View>

            {currentStep > 1 && (
                <Animated.View
                    entering={FadeInDown.duration(180)}
                    exiting={FadeOutDown.duration(120)}
                    style={styles.backButton}
                >
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('common.actions.back')}
                        onPress={goToPreviousStep}
                        style={styles.backButtonPressable}
                    >
                        <SymbolView name="chevron.left" size={48} tintColor={colors.text} style={styles.backIcon} />
                    </Pressable>
                </Animated.View>
            )}

            <View style={styles.introContainer}>
                <Animated.View
                    style={[styles.imagesContainer, imageContainerAnimatedStyle]}
                >
                    <View style={styles.characterImageSlot}>


                        <Animated.View style={[styles.characterImageLayer, character21AnimatedStyle]}>
                            <Image
                                source={require('@/assets/images/character/21.png')}
                                style={styles.image}
                                contentFit="cover"
                            />
                        </Animated.View>

                        <Animated.View style={[styles.characterImageLayer, character20AnimatedStyle]}>
                            <Image
                                source={require('@/assets/images/character/20.png')}
                                style={styles.image}
                                contentFit="cover"
                            />
                        </Animated.View>
                    </View>

                    <Image
                        source={require('@/assets/images/character/0.png')}
                        style={styles.image2}
                        resizeMode="contain"
                    />
                </Animated.View>

                <View
                    style={{
                        paddingHorizontal: 42,
                        marginTop: 100,
                    }}
                >
                    <Animated.Text
                        style={[styles.introText, introTextAnimatedStyle, { color: introTitleColor, fontSize: fontSizes['6xl'], }]}
                    >
                        {t('daily.intro.title')}
                    </Animated.Text>

                    <Animated.Text
                        style={[styles.subIntroText, subIntroTextAnimatedStyle, { color: introSubtitleColor, fontSize: fontSizes['3xl'], }]}
                    >
                        {t('daily.intro.subtitle')}
                    </Animated.Text>
                </View>
            </View>

            {isStep4 && (
                <View style={styles.step4DateContainer}>
                    <View style={styles.step4DateLabels}>
                        <Text style={[styles.step4DateLabel, { color: dateLabelColor, fontSize: fontSizes['5xl'], lineHeight: fontSizes['5xl'] + 1 }]}>{currentWeekday}.</Text>
                        <Text style={[styles.step4DateLabel, { color: dateLabelColor, fontSize: fontSizes['5xl'], lineHeight: fontSizes['5xl'] + 1 }]}>{currentMonth}.</Text>
                    </View>
                    <Text style={[styles.step4DateNumber, { color: dateNumberColor, fontSize: fontSizes['7xl'] + 34, lineHeight: fontSizes['7xl'] + 38 }]}>{currentDayNumber}</Text>
                </View>
            )}

            <View style={[styles.screen, isExtendedButtonExpanded && styles.screenExpanded]}>

                <Animated.View
                    pointerEvents={isExtendedButtonExpanded ? 'none' : 'auto'}
                    style={moonButtonAnimatedStyle}
                >
                    <PrimaryButton
                        onPress={goToNextStep}
                        image="moon.fill"
                        size="XS"
                        type="reverse"
                    />
                </Animated.View>


                <ExtendedButton
                    onPress={toggleExtendedButtonSize}
                    onPressIn={currentStep === 1 ? handleExtendedButtonPressIn : undefined}
                    onPressOut={currentStep === 1 ? handleExtendedButtonPressOut : undefined}
                    pressDisabled={currentStep !== 1 && !isStep4}
                    width={extendedButtonWidth}
                    height={extendedButtonHeight}
                    borderRadius={extendedButtonBorderRadius}
                    backgroundColor={"#353535"}
                    style={extendedButtonPressAnimatedStyle as unknown as StyleProp<ViewStyle>}
                    contentStyle={currentStep === 2 || currentStep === 3 || isStep4 ? styles.extendedButtonContentStep2 : undefined}
                >
                    {
                        currentStep === 1 && (
                            <Text style={[styles.extendedButtonText, { color: panelActionTextColor, fontSize: fontSizes['3xl'] }]}>{currentStep < steps.length ? t('daily.actions.ready') : t('daily.actions.finish')}</Text>
                        )
                    }
                    {
                        currentStep === 3 && (
                            <View style={styles.step2Content}>
                                <Animated.View
                                    exiting={step2ExitingAnimation}
                                    style={styles.dailyCirclesRow}
                                >
                                    {dailyCompletionDays.map((day, index) => (
                                        <DailyCircle
                                            key={day.dayLabel}
                                            label={day.dayLabel}
                                            completionPercent={day.completionPercent}
                                            animationDelay={dailyCircleFirstEntranceDelay + index * dailyCircleEntranceDelayStep}
                                        />
                                    ))}
                                </Animated.View>

                                <Animated.View
                                    entering={FadeInDown.delay(centralProgressEntranceDelay).springify()}
                                    exiting={step2ExitingAnimation}
                                    style={styles.centralProgressBlock}
                                >
                                    <View style={styles.step2MetricsRow}>
                                        <Text style={[styles.completionPercent, { color: panelTextColor, fontSize: fontSizes['5xl'] }]}>{displayedCompletionPercent}%</Text>
                                        <Animated.View style={[styles.streakContainer, streakContainerAnimatedStyle]}>
                                            <View style={styles.streakTextSlot}>
                                                <Animated.Text
                                                    key={`streak-text-${displayedStreak}`}
                                                    entering={shouldAnimateStreakChange ? FadeInUp.delay(200) : undefined}
                                                    exiting={FadeOutDown}
                                                    style={[
                                                        styles.streakText,
                                                        styles.streakTextLayer,
                                                        { color: streakTextColor, fontSize: fontSizes['3xl'], lineHeight: fontSizes['3xl'] + 6 },
                                                    ]}
                                                >
                                                    {displayedStreak}
                                                </Animated.Text>
                                            </View>
                                            <View style={styles.streakIconSlot}>
                                                <Animated.View
                                                    key={`streak-icon-${streakIconKey}`}
                                                    entering={shouldAnimateStreakChange ? FadeInUp.delay(200) : undefined}
                                                    exiting={FadeOutDown}
                                                    style={styles.streakIconLayer}
                                                >
                                                    <Image
                                                        source={streakIconSource}
                                                        style={styles.streakIcon}
                                                        contentFit="contain"
                                                    />
                                                </Animated.View>
                                            </View>
                                        </Animated.View>
                                    </View>

                                    <View style={[styles.progressTrack, { backgroundColor: progressTrackColor }]}>
                                        <Animated.View
                                            style={[
                                                styles.progressFill,
                                                { backgroundColor: progressFillColor },
                                                centralProgressFillAnimatedStyle,
                                            ]}
                                        />
                                    </View>
                                </Animated.View>

                                <Animated.View
                                    entering={FadeInDown.delay(supportContentEntranceDelay)}
                                    exiting={step2ExitingAnimation}
                                    style={styles.motivationBlock}
                                >
                                    <Text style={[styles.motivationTitle, { color: panelTextMutedColor, fontSize: fontSizes.xl }]}>{dailyMotivation.titleKey ? t(dailyMotivation.titleKey) : ''}</Text>
                                    <Text style={[styles.motivationBody, { color: panelTextSoftColor, fontSize: fontSizes.lg, lineHeight: fontSizes.lg + 4 }]}>{dailyMotivation.bodyKey ? t(dailyMotivation.bodyKey, dailyMotivation.values) : ''}</Text>
                                </Animated.View>

                                <Animated.View
                                    entering={FadeInDown.delay(supportContentEntranceDelay + 200)}
                                    exiting={step2ExitingAnimation}
                                    style={styles.step2NextButtonWrapper}
                                >
                                    <Animated.View style={step2NextButtonAnimatedStyle}>
                                        <Pressable
                                            accessibilityRole="button"
                                            onPressIn={handleStep2NextPressIn}
                                            onPressOut={handleStep2NextPressOut}
                                            onPress={handleStep3NextPress}
                                        >
                                            <SquircleView
                                                style={[styles.step2NextButton, { backgroundColor: "#ffffff21" }]}
                                                cornerSmoothing={100}
                                                preserveSmoothing
                                            >
                                                <Text style={[styles.step2NextButtonText, { color: panelActionTextColor, fontSize: fontSizes.lg }]}>{t('daily.actions.next')}</Text>
                                            </SquircleView>
                                        </Pressable>
                                    </Animated.View>
                                </Animated.View>
                            </View>
                        )
                    }
                    {
                        currentStep === 2 && (
                            <View style={styles.step3Content}>
                                <Animated.Text
                                    entering={FadeInDown.delay(step3ContentEntranceDelay)}
                                    exiting={FadeOut.duration(120)}
                                    style={[styles.step3Title, { color: panelTextMutedColor, fontSize: fontSizes['2xl'], lineHeight: fontSizes['2xl'] + 8 }]}
                                >
                                    {t('daily.pending.titlePrefix')} <Text style={[styles.step3TitleStrong, { color: panelTextColor }]}>{t('daily.pending.titleStrong')}</Text>
                                </Animated.Text>

                                {pendingTasks.length > 0 ? (
                                    <Animated.View
                                        entering={FadeInDown.delay(step3ContentEntranceDelay + step3ContentEntranceDelayStep)}
                                        exiting={FadeOut.duration(120)}
                                        style={styles.pendingTasksScrollWrapper}
                                    >
                                        <ScrollView
                                            style={styles.pendingTasksScroll}
                                            contentContainerStyle={styles.pendingTasksList}
                                            showsVerticalScrollIndicator={shouldShowPendingTasksScrollIndicator}
                                        >
                                            {pendingTasks.map((task) => (
                                                <TaskItem
                                                    key={task.id}
                                                    item={task}
                                                    drag={() => { }}
                                                    isActive={false}
                                                    handleToggleTask={handleTogglePendingTask}
                                                    handleTaskPress={() => { }}
                                                    selectedTaskId={null}
                                                    listHeight={0}
                                                    layoutAnimationKey={pendingTaskListLayoutKey}
                                                    mode="daily"
                                                    isExtendable={false}
                                                    isTogglePending={pendingToggleTaskIds.has(task.id)}
                                                    onDeleteTask={handleDeletePendingTask}
                                                    onMoveTask={handlePostponePendingTask}
                                                />
                                            ))}
                                        </ScrollView>
                                    </Animated.View>
                                ) : (
                                    <Animated.View
                                        entering={FadeInDown.delay(step3ContentEntranceDelay + step3ContentEntranceDelayStep * 2).duration(260)}
                                        exiting={FadeOut.duration(120)}
                                        style={styles.step3EmptyState}
                                    >
                                        <View style={[styles.step3EmptyIconCircle, { borderColor: alphaColor(panelTextColor, 0.42) }]}>
                                            <Feather name="check" size={72} color={panelTextMutedColor} strokeWidth={1.8} />
                                        </View>
                                    </Animated.View>
                                )}

                                <Animated.View
                                    entering={FadeInDown.delay(step3ContentEntranceDelay + step3ContentEntranceDelayStep * 3)}
                                    exiting={FadeOut.duration(120)}
                                    style={styles.step3DoneButtonWrapper}
                                >
                                    <Animated.View style={step3DoneButtonAnimatedStyle}>
                                        <Pressable
                                            accessibilityRole="button"
                                            onPressIn={handleStep3DonePressIn}
                                            onPressOut={handleStep3DonePressOut}
                                            onPress={handleStep2DonePress}
                                        >
                                            <SquircleView
                                                style={[styles.step3DoneButton, { backgroundColor: "#ffffff21" }]}
                                                cornerSmoothing={100}
                                                preserveSmoothing
                                            >
                                                {hasPendingDailyMutations ? (
                                                    <ActivityIndicator color={panelActionTextColor} size="small" />
                                                ) : (
                                                    <Text style={[styles.step3DoneButtonText, { color: panelActionTextColor, fontSize: fontSizes.lg }]}>{t('daily.actions.done')}</Text>
                                                )}
                                            </SquircleView>
                                        </Pressable>
                                    </Animated.View>
                                </Animated.View>
                            </View>
                        )
                    }
                    {
                        isStep4 && (
                            <View style={styles.step4Slider}>
                                <Animated.Text style={[styles.step4SliderText, { color: panelActionTextColor, fontSize: fontSizes['2xl'] }, step4SliderTextAnimatedStyle]}>
                                    {t('daily.actions.startDay')}
                                </Animated.Text>

                                <GestureDetector gesture={step4SliderGesture}>
                                    <Animated.View style={[styles.step4SliderHandleWrapper, step4SliderHandleAnimatedStyle]}>
                                        <SquircleView
                                            style={[styles.step4SliderHandle, { backgroundColor: "#ffffff21" }]}
                                            cornerSmoothing={100}
                                            preserveSmoothing
                                        >
                                            <Feather name="chevrons-right" size={36} color={iconOnPanelColor} strokeWidth={2.2} />
                                        </SquircleView>
                                    </Animated.View>
                                </GestureDetector>
                            </View>
                        )
                    }
                </ExtendedButton>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 32,
    },
    loadingText: {
        fontFamily: 'Satoshi-Medium',
        textAlign: 'center',
        opacity: 0.58,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        paddingTop: 60,
        zIndex: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    backButton: {
        position: 'absolute',
        top: 68,
        left: 24,
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    backButtonPressable: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        width: "100%",
        height: "100%",
        opacity: 0.3,
    },
    introContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        transform: [{ translateY: -275 }],
    },
    imagesContainer: {
        position: 'relative',
        width: imageContainerSize,
        height: imageContainerSize,
    },
    characterImageSlot: {
        position: 'relative',
        width: "100%",
        height: "80%",
    },
    characterImageLayer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,

    },
    image: {
        width: "100%",
        height: "100%",
        alignSelf: 'center',
        filter: 'blur(5px)',

    },
    image2: {
        width: "100%",
        height: "20%",
        marginBottom: 24,
        alignSelf: 'center',
    },

    introText: {
        fontFamily: 'Satoshi-Bold',
    },
    subIntroText: {
        fontFamily: 'Satoshi-Bold',
    },
    step4DateContainer: {
        position: 'absolute',
        top: '62%',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    step4DateLabels: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: 10,
        marginBottom: 6,
    },
    step4DateLabel: {
        fontFamily: 'Satoshi-Bold',
        letterSpacing: 0,
    },
    step4DateNumber: {
        fontFamily: 'Satoshi-Bold',
        letterSpacing: 0,
    },
    screen: {
        width: "90%",
        justifyContent: 'space-between',
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        alignSelf: 'center',
        position: 'absolute',
        bottom: 40,
        alignItems: 'flex-end',
    },
    screenExpanded: {
        gap: 0,
    },
    extendedButtonContentStep2: {
        alignItems: 'stretch',
        justifyContent: 'flex-start',
    },
    extendedButtonText: {
        fontFamily: 'Satoshi-Medium',
    },
    step2Content: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 18,
        paddingTop: 30,
        paddingBottom: 18,
    },
    dailyCirclesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 42,
        gap: 4,
        alignSelf: 'center',
    },
    centralProgressBlock: {
        width: '100%',
    },
    step2MetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    completionPercent: {
        fontFamily: 'Satoshi-Medium',
        letterSpacing: 0,
    },
    streakText: {
        fontFamily: 'Satoshi-Medium',
        textAlign: 'right',
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginBottom: 7,
    },
    streakTextSlot: {
        minWidth: 28,
        height: 30,
        overflow: 'hidden',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    streakTextLayer: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    streakIcon: {
        width: 26,
        height: 26,
    },
    streakIconSlot: {
        width: 26,
        height: 26,
        overflow: 'hidden',
    },
    streakIconLayer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    progressTrack: {
        position: 'relative',
        width: '100%',
        height: 13,
        borderRadius: 7,
        marginBottom: 42,
    },
    progressFill: {
        height: '100%',
        borderRadius: 7,
    },
    motivationBlock: {
        gap: 2,
    },
    motivationTitle: {
        fontFamily: 'Satoshi-Medium',
    },
    motivationBody: {
        fontFamily: 'Satoshi-Medium',
    },
    step2NextButtonWrapper: {
        marginTop: 'auto',
    },
    step2NextButton: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    step2NextButtonText: {
        fontFamily: 'Satoshi-Medium',
    },
    step3Content: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 18,
    },
    step3Title: {
        fontFamily: 'Satoshi-Medium',
        marginBottom: 18,
    },
    step3TitleStrong: {
        fontFamily: 'Satoshi-Bold',
    },
    pendingTasksList: {
        gap: 10,
        paddingBottom: 4,
    },
    pendingTasksScrollWrapper: {
        flex: 1,
    },
    pendingTasksScroll: {
        flex: 1,
    },
    step3EmptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 12,
    },
    step3EmptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    step3DoneButtonWrapper: {
        marginTop: 'auto',
        paddingTop: 12,
    },
    step3DoneButton: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    step3DoneButtonText: {
        fontFamily: 'Satoshi-Medium',
    },
    step4Slider: {
        flex: 1,
        width: '100%',
        minHeight: 64,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 2,
    },
    step4SliderHandleWrapper: {
        position: 'absolute',
        left: step4SliderHorizontalInset,
        top: 4,
        width: step4SliderHandleWidth,
        height: 56,
        zIndex: 4,
        elevation: 4,
    },
    step4SliderHandle: {
        flex: 1,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    step4SliderText: {
        fontFamily: 'Satoshi-Regular',
        textAlign: 'center',
        paddingLeft: 70,
        zIndex: 1,
    },
});
