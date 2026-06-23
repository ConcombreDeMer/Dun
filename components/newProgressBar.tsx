import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useFont } from '../lib/FontContext';
import { useAppTranslation } from '../lib/i18n';
import { useTheme } from '../lib/ThemeContext';

type NewProgressBarProps = {
    progress: number;
    completedTasks: number;
    totalTasks: number;
    completedTaskIds?: (number | string)[];
    scopeKey?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const clampProgress = (progress: number) => Math.max(0, Math.min(100, Math.round(progress)));

const plural = (count: number, singular: string, pluralLabel: string) => {
    return count > 1 ? pluralLabel : singular;
};

function NewProgressBar({
    progress,
    completedTasks,
    totalTasks,
    completedTaskIds = [],
    scopeKey = 'default',
}: NewProgressBarProps) {
    const { actualTheme, colors } = useTheme();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();
    const clampedProgress = clampProgress(progress);
    const remainingTasks = Math.max(0, totalTasks - completedTasks);
    const animatedProgress = useSharedValue(clampedProgress);
    const expandedProgress = useSharedValue(0);
    const pressProgress = useSharedValue(0);
    const completionPulse = useSharedValue(0);
    const [displayProgress, setDisplayProgress] = useState(clampedProgress);
    const displayProgressRef = useRef(clampedProgress);
    const seenCompletedTaskIdsRef = useRef(new Set(completedTaskIds.map(String)));
    const previousCompletedIdsRef = useRef(new Set(completedTaskIds.map(String)));
    const previousScopeKeyRef = useRef(scopeKey);
    const hasMountedRef = useRef(false);

    const palette = useMemo(() => {
        const isDark = actualTheme === 'dark';
        const fill = isDark ? '#42E690' : '#08E18B';
        const fillGlow = isDark ? '#5CFFAD' : '#13F4A0';

        return {
            fill,
            fillEnd: fillGlow,
            track: isDark ? 'rgba(92, 255, 173, 0.13)' : 'rgba(8, 225, 139, 0.13)',
            accentSoft: isDark ? 'rgba(92, 255, 173, 0.13)' : 'rgba(8, 225, 139, 0.13)',
            icon: fill,
        };
    }, [actualTheme]);

    useEffect(() => {
        animatedProgress.value = withTiming(clampedProgress, {
            duration: 420,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        });

        const startValue = displayProgressRef.current;
        const delta = clampedProgress - startValue;
        const startedAt = Date.now();
        let frame = 0;

        const tick = () => {
            const elapsed = Date.now() - startedAt;
            const phase = Math.min(1, elapsed / 420);
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
                    duration: 680,
                    easing: Easing.out(Easing.quad),
                })
            );
        }
    }, [completedTaskIds, completionPulse, scopeKey]);

    const fillStyle = useAnimatedStyle(() => {
        const minWidth = animatedProgress.value > 0 ? 8 : 0;

        return {
            width: `${animatedProgress.value}%`,
            minWidth,
        };
    });

    const glowFillStyle = useAnimatedStyle(() => {
        const pulseLift = completionPulse.value * 0.55;

        return {
            width: `${animatedProgress.value}%`,
            minWidth: animatedProgress.value > 0 ? 8 : 0,
            opacity: animatedProgress.value > 0 ? 0.58 + pulseLift : 0,
            transform: [
                {
                    scaleY: 1 + completionPulse.value * 0.14,
                },
            ],
        };
    });

    const rootAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: 1 + completionPulse.value * 0.018 - pressProgress.value * 0.006,
                },
            ],
        };
    });

    const rootSpacingAnimatedStyle = useAnimatedStyle(() => {
        return {
            marginBottom: interpolate(expandedProgress.value, [0, 1], [0, 10]),
        };
    });

    const detailsAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: interpolate(expandedProgress.value, [0, 1], [0, 126]),
            opacity: expandedProgress.value,
            transform: [
                {
                    translateY: interpolate(expandedProgress.value, [0, 1], [-12, 0]),
                },
            ],
        };
    });

    const chevronAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    rotate: `${interpolate(expandedProgress.value, [0, 1], [0, 180])}deg`,
                },
            ],
        };
    });

    const labelAnimatedStyle = useAnimatedStyle(() => {
        return {
            color: interpolateColor(
                completionPulse.value,
                [0, 1],
                [colors.text, palette.fillEnd]
            ),
        };
    });

    const onToggleDetails = () => {
        const nextValue = expandedProgress.value > 0.5 ? 0 : 1;
        expandedProgress.value = withTiming(nextValue, {
            duration: nextValue ? 260 : 220,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        });
    };

    const onPressIn = () => {
        pressProgress.value = withTiming(1, { duration: 120 });
    };

    const onPressOut = () => {
        pressProgress.value = withTiming(0, { duration: 160 });
    };

    const dayStatus = useMemo(() => {
        if (totalTasks === 0) return t('home.progress.empty');
        if (remainingTasks === 0) return t('home.progress.complete');
        if (clampedProgress >= 70) return t('home.progress.close');
        if (clampedProgress >= 35) return t('home.progress.inMotion');
        return t('home.progress.start');
    }, [clampedProgress, remainingTasks, t, totalTasks]);

    const renderSummary = () => {
        const taskLabel = plural(remainingTasks, t('home.progress.task'), t('home.progress.tasks'));

        if (totalTasks === 0) {
            return t('home.progress.noTasks');
        }

        if (remainingTasks === 0) {
            return t('home.progress.allDone');
        }

        return (
            <>
                {t('home.progress.remainingPrefix')}{' '}
                <Text style={[styles.summaryStrong, { color: colors.text }]}>{remainingTasks} {taskLabel}</Text>
                {' '}{t('home.progress.remainingAction')}
                {'\n'}
                {t('home.progress.remainingSuffix', { total: totalTasks })}
            </>
        );
    };

    return (
        <Animated.View style={[styles.root, rootSpacingAnimatedStyle]}>
            <AnimatedPressable
                onPress={onToggleDetails}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[
                    styles.shell,
                    rootAnimatedStyle,
                ]}
            >
                <View style={styles.topRow}>
                    <View style={styles.trackWrap}>
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.glowFill,
                                { backgroundColor: palette.fill, shadowColor: palette.fillEnd },
                                glowFillStyle,
                            ]}
                        />
                        <View style={[styles.track, { backgroundColor: colors.checkbox }]}>
                            <Animated.View
                                style={[
                                    styles.fill,
                                    { backgroundColor: palette.fill },
                                    fillStyle,
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.percentWrap}>
                        <Animated.Text
                            style={[
                                styles.percent,
                                { fontSize: fontSizes['2xl'], color: colors.text },
                                labelAnimatedStyle,
                            ]}
                        >
                            {displayProgress}%
                        </Animated.Text>
                        <Animated.View style={chevronAnimatedStyle}>
                            <Feather name="chevron-down" size={15} color={colors.textSecondary} strokeWidth={2.4} />
                        </Animated.View>
                    </View>
                </View>

                <Animated.View style={[styles.detailsClip, detailsAnimatedStyle]}>
                    <View style={styles.details}>
                        <View style={styles.summaryLine}>
                            <Text
                                style={[
                                    styles.summaryText,
                                    {
                                        color: colors.textSecondary,
                                        fontSize: fontSizes['2xl'],
                                        lineHeight: fontSizes['2xl'] + 8,
                                    },
                                ]}
                            >
                                {renderSummary()}
                            </Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <View style={[styles.statIcon, { backgroundColor: palette.accentSoft }]}>
                                    <Feather name="check" size={13} color={palette.icon} strokeWidth={3} />
                                </View>
                                <Text style={[styles.statValue, { color: colors.text, fontSize: fontSizes.base }]}>
                                    {completedTasks}/{totalTasks}
                                </Text>
                            </View>

                            {/* <View style={styles.divider} /> */}

                            {/* <Text
                                numberOfLines={1}
                                style={[styles.statusText, { color: colors.textSecondary, fontSize: fontSizes.base }]}
                            >
                                {dayStatus}
                            </Text> */}
                        </View>
                    </View>
                </Animated.View>
            </AnimatedPressable>
        </Animated.View>
    );
}

export default memo(NewProgressBar);

const styles = StyleSheet.create({
    root: {
        width: '100%',
        paddingHorizontal: 40,
        marginTop: 10,
        marginBottom: 0,
    },
    shell: {
        width: '100%',
        minHeight: 42,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    trackWrap: {
        flex: 1,
        height: 20,
        justifyContent: 'center',
    },
    track: {
        height: 18,
        borderRadius: 999,
        overflow: 'hidden',
    },
    glowFill: {
        position: 'absolute',
        left: 0,
        height: 16,
        borderRadius: 999,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.62,
        shadowRadius: 10,
        elevation: 4,
    },
    fill: {
        height: '100%',
        borderRadius: 999,
        overflow: 'hidden',
    },
    percentWrap: {
        minWidth: 72,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
    },
    percent: {
        fontFamily: 'Satoshi-Bold',
        fontVariant: ['tabular-nums'],
        letterSpacing: 0,
    },
    detailsClip: {
        overflow: 'hidden',
    },
    details: {
        marginTop: 14,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 6,
        gap: 14,
    },
    summaryLine: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryText: {
        flex: 1,
        fontFamily: 'Satoshi-Regular',
    },
    summaryStrong: {
        fontFamily: 'Satoshi-Bold',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    statIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontFamily: 'Satoshi-Bold',
        fontVariant: ['tabular-nums'],
    },
    divider: {
        width: 1,
        height: 18,
        backgroundColor: 'rgba(150, 150, 150, 0.24)',
    },
    statusText: {
        flex: 1,
        fontFamily: 'Satoshi-Medium',
    },
});
