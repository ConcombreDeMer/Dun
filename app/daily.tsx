import DailyCircle from '@/components/dailyCircle';
import ExtendedButton from '@/components/extendedButton';
import PrimaryButton from '@/components/primaryButton';
import { TaskItem } from '@/components/TaskItem';
import { dailyCompletionDays, dailyMotivation, dailyPendingTasks, dailyStreak, previousDayCompletion, type DailyPendingTask } from '@/lib/dailyMock';
import { useFont } from '@/lib/FontContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SquircleView } from 'expo-squircle-view';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
const frenchWeekdayAbbreviations = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const frenchMonthAbbreviations = ['jan', 'fév', 'mar', 'avr', 'mai', 'jui', 'jui', 'aoû', 'sep', 'oct', 'nov', 'déc'];
const step4SliderHandleWidth = 72;
const step4SliderHorizontalInset = 4;
const step4SliderCompletionThreshold = 0.86;

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
    const { colors } = useTheme();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const [currentStep, setCurrentStep] = useState(1);
    const [isExtendedButtonExpanded, setIsExtendedButtonExpanded] = useState(false);
    const [step2ExitDirection, setStep2ExitDirection] = useState<'previous' | 'next'>('next');
    const [displayedCompletionPercent, setDisplayedCompletionPercent] = useState(0);
    const [displayedStreak, setDisplayedStreak] = useState(dailyStreak);
    const [pendingTasks, setPendingTasks] = useState<DailyPendingTask[]>(dailyPendingTasks);
    const today = useMemo(() => new Date(), []);
    const moonButtonOpacity = useSharedValue(1);
    const moonButtonScale = useSharedValue(1);
    const moonButtonWidth = useSharedValue(64);
    const introTextOpacity = useSharedValue(1);
    const introTextTranslateY = useSharedValue(0);
    const subIntroTextOpacity = useSharedValue(1);
    const subIntroTextTranslateY = useSharedValue(0);
    const animatedImageContainerSize = useSharedValue(imageContainerSize);
    const animatedPreviousDayProgress = useSharedValue(0);
    const centralProgressScaleY = useSharedValue(1);
    const streakContainerScale = useSharedValue(1);
    const step4SliderTranslateX = useSharedValue(0);
    const step4SliderDragStartX = useSharedValue(0);
    const { fontSizes } = useFont();

    const previousDayFullDone = false;
    const isStep4 = currentStep === 4;
    const currentWeekday = frenchWeekdayAbbreviations[today.getDay()];
    const currentMonth = frenchMonthAbbreviations[today.getMonth()];
    const currentDayNumber = today.getDate();
    const isPreviousDayCompleted = previousDayCompletion.percent >= 100;
    const streakTargetValue = isPreviousDayCompleted ? dailyStreak + 1 : 0;
    const streakIconSource = getStreakIconSource(displayedStreak);
    const streakIconKey = getStreakIconKey(displayedStreak);
    const shouldAnimateStreakChange = displayedStreak !== dailyStreak;
    const streakTextColor = displayedStreak > 0 ? '#FFA652' : 'rgba(255, 255, 255, 0.42)';
    const pendingTaskListLayoutKey = useMemo(
        () => pendingTasks.map((task) => task.id).join('-'),
        [pendingTasks]
    );
    const steps = useMemo(
        () => Array.from({ length: previousDayFullDone ? 3 : 4 }, (_, index) => index + 1),
        [previousDayFullDone]
    );

    const removePendingTask = useCallback((task: { id: number }) => {
        setPendingTasks((tasks) => tasks.filter((candidate) => candidate.id !== task.id));
    }, []);

    const handleStep2NextPress = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStep2ExitDirection('next');
        setIsExtendedButtonExpanded(true);
        setCurrentStep((step) => step + 1);
    }, []);

    const finishDailyAndExit = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace('/home');
    }, [router]);

    const goToNextStep = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (currentStep < steps.length) {
            setCurrentStep((step) => step + 1);
            return;
        }

        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace('/home');
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
    const step3AdaptiveHeight = 12+ Math.min(
        step3MaxHeight,
        step3PanelFixedHeight + Math.min(step3TaskListHeight, step3MaxListHeight)
    );
    const extendedButtonExpandedHeight = currentStep === 3
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
        })
        .onUpdate((event) => {
            const nextTranslateX = step4SliderDragStartX.value + event.translationX;
            step4SliderTranslateX.value = Math.min(Math.max(nextTranslateX, 0), step4SliderMaxTranslate);
        })
        .onFinalize(() => {
            const hasCompletedSlider = step4SliderTranslateX.value >= step4SliderMaxTranslate * step4SliderCompletionThreshold;

            if (hasCompletedSlider) {
                step4SliderTranslateX.value = withTiming(step4SliderMaxTranslate, { duration: 180 });
                runOnJS(finishDailyAndExit)();
                return;
            }

            step4SliderTranslateX.value = withSpring(0);
        });

    const toggleExtendedButtonSize = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (currentStep === 1) {
            setIsExtendedButtonExpanded(true);
            goToNextStep();
        }
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
        step4SliderTranslateX.value = withTiming(0, { duration: 180 });
    }, [currentStep, step4SliderTranslateX]);

    useEffect(() => {
        if (currentStep !== 2) {
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
    }, [animatedPreviousDayProgress, centralProgressScaleY, currentStep, streakContainerScale, streakTargetValue]);

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

    const centralProgressFillAnimatedStyle = useAnimatedStyle(() => ({
        width: `${animatedPreviousDayProgress.value}%` as DimensionValue,
        transform: [{ scaleY: centralProgressScaleY.value }],
    }));

    const streakContainerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: streakContainerScale.value }],
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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.dotsContainer}>
                {steps.map((step) => (
                    <View
                        key={step}
                        style={[
                            styles.dot,
                            { backgroundColor: currentStep === step ? colors.text : colors.textSecondary || '#C4C4C4' },
                        ]}
                    />
                ))}
            </View>

            {currentStep > 1 && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Revenir a l'etape precedente"
                    onPress={goToPreviousStep}
                    style={styles.backButton}
                >
                    <SymbolView name="chevron.left" size={48} tintColor="#000000" style={styles.backIcon} />
                </Pressable>
            )}

            <View style={styles.introContainer}>
                <Animated.View
                    style={[styles.imagesContainer, imageContainerAnimatedStyle]}
                >
                    {
                        (currentStep === 1 || isStep4) && (
                            <Image
                                source={require('@/assets/images/character/21.png')}
                                style={styles.image}
                                contentFit="cover"
                            />
                        )
                    }
                    {
                        currentStep !== 1 && !isStep4 && (
                            <Image
                                source={require('@/assets/images/character/20.png')}
                                style={styles.image}
                                contentFit="cover"
                            />
                        )
                    }

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
                        style={[styles.introText, introTextAnimatedStyle, { fontSize: fontSizes['6xl'], }]}
                    >
                        Salut Yanis !
                    </Animated.Text>

                    <Animated.Text
                        style={[styles.subIntroText, subIntroTextAnimatedStyle, { fontSize: fontSizes['3xl'], }]}
                    >
                        Prêt pour cette nouvelle journée ?
                    </Animated.Text>
                </View>
            </View>

            {isStep4 && (
                <View style={styles.step4DateContainer}>
                    <View style={styles.step4DateLabels}>
                        <Text style={styles.step4DateLabel}>{currentWeekday}.</Text>
                        <Text style={styles.step4DateLabel}>{currentMonth}.</Text>
                    </View>
                    <Text style={styles.step4DateNumber}>{currentDayNumber}</Text>
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
                    pressDisabled={currentStep !== 1}
                    width={extendedButtonWidth}
                    height={extendedButtonHeight}
                    borderRadius={extendedButtonBorderRadius}
                    contentStyle={currentStep === 2 || currentStep === 3 || isStep4 ? styles.extendedButtonContentStep2 : undefined}
                >
                    {
                        currentStep === 1 && (
                            <Text style={styles.extendedButtonText}>{currentStep < steps.length ? "Prêt !" : "Terminer"}</Text>
                        )
                    }
                    {
                        currentStep === 2 && (
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
                                        <Text style={styles.completionPercent}>{displayedCompletionPercent}%</Text>
                                        <Animated.View style={[styles.streakContainer, streakContainerAnimatedStyle]}>
                                            <View style={styles.streakTextSlot}>
                                                <Animated.Text
                                                    key={`streak-text-${displayedStreak}`}
                                                    entering={shouldAnimateStreakChange ? FadeInUp.delay(200) : undefined}
                                                    exiting={FadeOutDown}
                                                    style={[
                                                        styles.streakText,
                                                        styles.streakTextLayer,
                                                        { color: streakTextColor },
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

                                    <View style={styles.progressTrack}>
                                        <Animated.View
                                            style={[
                                                styles.progressFill,
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
                                    <Text style={styles.motivationTitle}>{dailyMotivation.title}</Text>
                                    <Text style={styles.motivationBody}>{dailyMotivation.body}</Text>
                                </Animated.View>

                                <Animated.View
                                    entering={FadeInDown.delay(supportContentEntranceDelay + 200)}
                                    exiting={step2ExitingAnimation}
                                    style={styles.step2NextButtonWrapper}
                                >
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={handleStep2NextPress}
                                    >
                                        <SquircleView
                                            style={styles.step2NextButton}
                                            cornerSmoothing={100}
                                            preserveSmoothing
                                        >
                                            <Text style={styles.step2NextButtonText}>Suivant</Text>
                                        </SquircleView>
                                    </Pressable>
                                </Animated.View>
                            </View>
                        )
                    }
                    {
                        currentStep === 3 && (
                            <View style={styles.step3Content}>
                                <Animated.Text
                                    entering={FadeInDown.delay(200)}
                                    exiting={FadeOut.duration(120)}
                                    style={styles.step3Title}
                                >
                                    Tes tâches en <Text style={styles.step3TitleStrong}>suspens...</Text>
                                </Animated.Text>

                                {pendingTasks.length > 0 ? (
                                    <Animated.View
                                        entering={FadeInDown.delay(220)}
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
                                                    handleToggleTask={() => { }}
                                                    handleTaskPress={() => { }}
                                                    selectedTaskId={null}
                                                    listHeight={0}
                                                    layoutAnimationKey={pendingTaskListLayoutKey}
                                                    mode="daily"
                                                    isExtendable={false}
                                                    onDeleteTask={removePendingTask}
                                                    onMoveTask={removePendingTask}
                                                />
                                            ))}
                                        </ScrollView>
                                    </Animated.View>
                                ) : (
                                    <Animated.View
                                        entering={FadeInDown.delay(240).duration(260)}
                                        exiting={FadeOut.duration(120)}
                                        style={styles.step3EmptyState}
                                    >
                                        <View style={styles.step3EmptyIconCircle}>
                                            <Feather name="check" size={72} color="rgba(255, 255, 255, 0.58)" strokeWidth={1.8} />
                                        </View>
                                    </Animated.View>
                                )}

                                <Animated.View
                                    entering={FadeInDown.delay(260)}
                                    exiting={FadeOut.duration(120)}
                                    style={styles.step3DoneButtonWrapper}
                                >
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={goToNextStep}
                                    >
                                        <SquircleView
                                            style={styles.step3DoneButton}
                                            cornerSmoothing={100}
                                            preserveSmoothing
                                        >
                                            <Text style={styles.step3DoneButtonText}>On est bon !</Text>
                                        </SquircleView>
                                    </Pressable>
                                </Animated.View>
                            </View>
                        )
                    }
                    {
                        isStep4 && (
                            <View style={styles.step4Slider}>
                                <Animated.Text style={[styles.step4SliderText, step4SliderTextAnimatedStyle]}>
                                    Lancer la journée
                                </Animated.Text>

                                <GestureDetector gesture={step4SliderGesture}>
                                    <Animated.View style={[styles.step4SliderHandleWrapper, step4SliderHandleAnimatedStyle]}>
                                        <SquircleView
                                            style={styles.step4SliderHandle}
                                            cornerSmoothing={100}
                                            preserveSmoothing
                                        >
                                            <Feather name="chevrons-right" size={36} color="rgba(255, 255, 255, 0.56)" strokeWidth={2.2} />
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
        top: 58,
        left: 16,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    backIcon: {
        width: "100%",
        height: "100%",
        opacity: 0.5,
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
    image: {
        width: "100%",
        height: "80%",
        alignSelf: 'center',
    },
    image2: {
        width: "100%",
        height: "20%",
        marginBottom: 24,
        alignSelf: 'center',
    },

    introText: {
        fontFamily: 'Satoshi-Bold',
        color: '#0000009a',
        opacity: 0.7,
    },
    subIntroText: {
        fontFamily: 'Satoshi-Bold',
        color: '#00000062',
        opacity: 0.4,
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
        color: 'rgba(0, 0, 0, 0.28)',
        fontFamily: 'Satoshi-Bold',
        fontSize: 46,
        lineHeight: 43,
        letterSpacing: 0,
    },
    step4DateNumber: {
        color: 'rgba(0, 0, 0, 0.58)',
        fontFamily: 'Satoshi-Bold',
        fontSize: 92,
        lineHeight: 96,
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
        color: '#FFFFFF',
        fontFamily: 'Satoshi-Medium',
        fontSize: 24,
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
        gap : 4,
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
        color: '#FFFFFF',
        fontFamily: 'Satoshi-Medium',
        fontSize: 42,
        letterSpacing: 0,
    },
    streakText: {
        color: '#FFA652',
        fontFamily: 'Satoshi-Medium',
        fontSize: 24,
        lineHeight: 30,
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
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        marginBottom: 42,
    },
    progressFill: {
        height: '100%',
        borderRadius: 7,
        backgroundColor: '#70C48E',
    },
    motivationBlock: {
        gap: 2,
    },
    motivationTitle: {
        color: 'rgba(255, 255, 255, 0.56)',
        fontFamily: 'Satoshi-Medium',
        fontSize: 19,
    },
    motivationBody: {
        color: 'rgba(255, 255, 255, 0.72)',
        fontFamily: 'Satoshi-Medium',
        fontSize: 18,
        lineHeight: 22,
    },
    step2NextButtonWrapper: {
        marginTop: 'auto',
    },
    step2NextButton: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgb(95, 95, 95)',
    },
    step2NextButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Satoshi-Medium',
        fontSize: 18,
    },
    step3Content: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 18,
    },
    step3Title: {
        color: 'rgba(255, 255, 255, 0.58)',
        fontFamily: 'Satoshi-Medium',
        fontSize: 22,
        lineHeight: 30,
        marginBottom: 18,
    },
    step3TitleStrong: {
        color: '#FFFFFF',
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
        borderColor: 'rgba(255, 255, 255, 0.42)',
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
        backgroundColor: 'rgb(95, 95, 95)',
    },
    step3DoneButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Satoshi-Medium',
        fontSize: 18,
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
        backgroundColor: 'rgb(87, 87, 87)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    step4SliderText: {
        color: '#FFFFFF',
        fontFamily: 'Satoshi-Regular',
        fontSize: 20,
        textAlign: 'center',
        paddingLeft : 70,
        zIndex: 1,
    },
});
