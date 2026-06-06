import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    SharedValue,
    interpolate,
    interpolateColor,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useAppTranslation } from '../lib/i18n';
import { useTheme } from '../lib/ThemeContext';

type CircularProgressBarProps = {
    progress: number;
    completedTasks: number;
    totalTasks: number;
    completedTaskIds?: (number | string)[];
    scopeKey?: string;
    compactProgress?: SharedValue<number>;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE = 180;
const STROKE_WIDTH = 10;
const COMPLETE_STROKE_WIDTH = 14;
const GLOW_STROKE_WIDTH = STROKE_WIDTH + 0;
const RADIUS = (SIZE - GLOW_STROKE_WIDTH - 4) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const START_ANGLE = -90;

const clampProgress = (progress: number) => Math.max(0, Math.min(100, Math.round(progress)));

function CircularProgressBar({
    progress,
    completedTasks,
    totalTasks,
    completedTaskIds = [],
    scopeKey = 'default',
    compactProgress,
}: CircularProgressBarProps) {
    const { actualTheme, colors } = useTheme();
    const { t } = useAppTranslation();
    const clampedProgress = clampProgress(progress);
    const remainingTasks = Math.max(0, totalTasks - completedTasks);
    const animatedProgress = useSharedValue(clampedProgress);
    const detailProgress = useSharedValue(0);
    const completionPulse = useSharedValue(0);
    const [displayProgress, setDisplayProgress] = useState(clampedProgress);
    const displayProgressRef = useRef(clampedProgress);
    const fallbackCompactProgress = useSharedValue(0);
    const effectiveCompactProgress = compactProgress ?? fallbackCompactProgress;
    const seenCompletedTaskIdsRef = useRef(new Set(completedTaskIds.map(String)));
    const previousCompletedIdsRef = useRef(new Set(completedTaskIds.map(String)));
    const previousScopeKeyRef = useRef(scopeKey);
    const hasMountedRef = useRef(false);

    const taskLabel = remainingTasks > 1 ? t('home.progress.tasks') : t('home.progress.task');

    const palette = useMemo(() => {
        const isDark = actualTheme === 'dark';

        return {
            fill: isDark ? '#42E690' : '#08E18B',
            fillGlow: isDark ? '#5CFFAD' : '#13F4A0',
            track: isDark ? 'rgba(92, 255, 173, 0.13)' : 'rgba(8, 225, 139, 0.13)',
        };
    }, [actualTheme]);

    useEffect(() => {
        animatedProgress.value = withTiming(clampedProgress, {
            duration: 520,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        });

        const startValue = displayProgressRef.current;
        const delta = clampedProgress - startValue;
        const startedAt = Date.now();
        let frame = 0;

        const tick = () => {
            const elapsed = Date.now() - startedAt;
            const phase = Math.min(1, elapsed / 520);
            const eased = 1 - Math.pow(1 - phase, 3);
            const nextDisplayProgress = Math.round(startValue + delta * eased);
            displayProgressRef.current = nextDisplayProgress;
            setDisplayProgress(nextDisplayProgress);

            if (phase < 1) {
                frame = requestAnimationFrame(tick);
            }
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [animatedProgress, clampedProgress]);

    useEffect(() => {
        const completedIdSet = new Set(completedTaskIds.map(String));

        if (!hasMountedRef.current || previousScopeKeyRef.current !== scopeKey) {
            completedIdSet.forEach((id) => seenCompletedTaskIdsRef.current.add(id));
            previousCompletedIdsRef.current = completedIdSet;
            previousScopeKeyRef.current = scopeKey;
            hasMountedRef.current = true;
            return;
        }

        const hasFirstCompletion = [...completedIdSet].some((id) => {
            return !previousCompletedIdsRef.current.has(id) && !seenCompletedTaskIdsRef.current.has(id);
        });

        completedIdSet.forEach((id) => seenCompletedTaskIdsRef.current.add(id));
        previousCompletedIdsRef.current = completedIdSet;

        if (hasFirstCompletion) {
            completionPulse.value = 0;
            completionPulse.value = withSequence(
                withTiming(1, {
                    duration: 220,
                    easing: Easing.out(Easing.cubic),
                }),
                withTiming(0, {
                    duration: 720,
                    easing: Easing.out(Easing.quad),
                })
            );
        }
    }, [completedTaskIds, completionPulse, scopeKey]);

    const rootAnimatedStyle = useAnimatedStyle(() => {
        const isOpen = detailProgress.value;
        const compact = effectiveCompactProgress.value;

        return {
            height: interpolate(compact, [0, 1], [210 + isOpen * 10, 132], 'clamp'),
            marginBottom: interpolate(compact, [0, 1], [isOpen * 12, 0], 'clamp'),
            opacity: interpolate(compact, [0, 1], [1, 0.92], 'clamp'),
        };
    });

    const circleAnimatedStyle = useAnimatedStyle(() => {
        const compactScale = interpolate(effectiveCompactProgress.value, [0, 1], [1, 0.64], 'clamp');
        const openedScale = interpolate(detailProgress.value, [0, 1], [1, 0.66]);

        return {
            transform: [
                {
                    translateX: interpolate(detailProgress.value, [0, 1], [0, 104]),
                },
                {
                    scale: compactScale * openedScale + completionPulse.value * 0.025,
                },
            ],
        };
    });

    const detailBlockAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: detailProgress.value,
            transform: [
                {
                    translateX: interpolate(detailProgress.value, [0, 1], [-22, 0]),
                },
            ],
        };
    });

    const firstLineAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(detailProgress.value, [0, 0.38], [0, 1], 'clamp'),
            transform: [{ translateY: interpolate(detailProgress.value, [0, 0.38], [10, 0], 'clamp') }],
        };
    });

    const secondLineAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(detailProgress.value, [0.16, 0.62], [0, 1], 'clamp'),
            transform: [{ translateY: interpolate(detailProgress.value, [0.16, 0.62], [10, 0], 'clamp') }],
        };
    });

    const thirdLineAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(detailProgress.value, [0.32, 0.86], [0, 1], 'clamp'),
            transform: [{ translateY: interpolate(detailProgress.value, [0.32, 0.86], [10, 0], 'clamp') }],
        };
    });

    const strongTextAnimatedStyle = useAnimatedStyle(() => {
        return {
            color: interpolateColor(detailProgress.value, [0, 1], [colors.textSecondary, colors.text]),
        };
    });

    const progressAnimatedProps = useAnimatedProps(() => {
        return {
            strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value / 100),
        };
    });

    const toggleDetails = () => {
        const nextValue = detailProgress.value > 0.5 ? 0 : 1;
        detailProgress.value = withSpring(nextValue, {
            damping: 18,
            stiffness: 160,
            mass: 0.8,
        });
    };

    return (
        <Animated.View style={[styles.root, rootAnimatedStyle]}>
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.detailBlock,
                    detailBlockAnimatedStyle,
                ]}
            >
                <Animated.Text
                    style={[
                        styles.detailLine,
                        { color: colors.textSecondary },
                        firstLineAnimatedStyle,
                    ]}
                >
                    {totalTasks === 0 ? t('home.progress.noTasks') : t('home.progress.remainingPrefix')}{' '}
                    {totalTasks > 0 ? (
                        <Animated.Text style={[styles.detailStrong, strongTextAnimatedStyle]}>
                            {remainingTasks} {taskLabel}
                        </Animated.Text>
                    ) : null}
                </Animated.Text>
                {totalTasks > 0 ? (
                    <>
                        <Animated.Text
                            style={[
                                styles.detailLine,
                                { color: colors.textSecondary },
                                secondLineAnimatedStyle,
                            ]}
                        >
                            {t('home.progress.remainingAction')}
                        </Animated.Text>
                        <Animated.Text
                            style={[
                                styles.detailLine,
                                { color: colors.textSecondary },
                                thirdLineAnimatedStyle,
                            ]}
                        >
                            {t('home.progress.remainingSuffixStart')}{' '}
                            <Animated.Text style={[styles.detailStrong, strongTextAnimatedStyle]}>
                                {totalTasks} {t('home.progress.totalTasks')}
                            </Animated.Text>{' '}
                            {t('home.progress.remainingSuffixEnd')}
                        </Animated.Text>
                    </>
                ) : null}
            </Animated.View>

            <AnimatedPressable onPressIn={toggleDetails} style={[styles.circleWrap, circleAnimatedStyle]}>
                <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={palette.track}
                        strokeWidth={STROKE_WIDTH}
                        fill="none"
                    />
                    <AnimatedCircle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={palette.fillGlow}
                        strokeWidth={GLOW_STROKE_WIDTH}
                        strokeOpacity={0.16}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                        animatedProps={progressAnimatedProps}
                        transform={`rotate(${START_ANGLE} ${SIZE / 2} ${SIZE / 2})`}
                    />
                    <AnimatedCircle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={palette.fill}
                        strokeWidth={COMPLETE_STROKE_WIDTH}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                        animatedProps={progressAnimatedProps}
                        transform={`rotate(${START_ANGLE} ${SIZE / 2} ${SIZE / 2})`}
                    />
                </Svg>

                <View style={styles.labelWrap} pointerEvents="none">
                    <Text
                        style={[
                            styles.percent,
                            { color: colors.text },
                        ]}
                    >
                        {displayProgress}%
                    </Text>
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

export default memo(CircularProgressBar);

const styles = StyleSheet.create({
    root: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    detailBlock: {
        position: 'absolute',
        left: 32,
        width: 260,
        zIndex: 0,
    },
    detailLine: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 20,
        lineHeight: 30,
        letterSpacing: 0,
        marginLeft: 10,
    },
    detailStrong: {
        fontFamily: 'Satoshi-Bold',
    },
    circleWrap: {
        width: SIZE,
        height: SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    labelWrap: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    percent: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 44,
        fontVariant: ['tabular-nums'],
        letterSpacing: 0,
        includeFontPadding: false,
    },
});
