import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
    FadeInDown,
    interpolateColor,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

type DailyCircleProps = {
    label: string;
    completionPercent: number;
    animationDelay?: number;
};

const circleSize = 39;
const strokeWidth = 1.8;
const radius = (circleSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;
const entryAnimationDuration = 420;
const progressAnimationDuration = 520;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function DailyCircle({ label, completionPercent, animationDelay = 0 }: DailyCircleProps) {
    const progress = Math.max(0, Math.min(completionPercent, 100));
    const isComplete = progress === 100;
    const isNotComplete = progress > 0 && progress < 100;
    const isEmpty = progress === 0;
    const animatedProgress = useSharedValue(0);
    const completedReveal = useSharedValue(0);

    useEffect(() => {
        const stateAnimationDelay = animationDelay + entryAnimationDuration;
        const completionRevealDelay = stateAnimationDelay + progressAnimationDuration;

        animatedProgress.value = 0;
        completedReveal.value = 0;

        if (!isEmpty) {
            animatedProgress.value = withDelay(
                stateAnimationDelay,
                withTiming(progress, { duration: progressAnimationDuration })
            );
        }

        if (isComplete) {
            completedReveal.value = withDelay(
                completionRevealDelay,
                withTiming(1, { duration: 140 })
            );
        }
    }, [animatedProgress, animationDelay, completedReveal, isComplete, isEmpty, progress]);

    const progressCircleAnimatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - animatedProgress.value / 100),
    }));

    const baseCircleAnimatedProps = useAnimatedProps(() => ({
        fill: isEmpty || isNotComplete
            ? 'rgba(255, 255, 255, 0.06)'
            : interpolateColor(
                completedReveal.value,
                [0, 1],
                ['rgba(255, 255, 255, 0.06)', 'rgba(112, 216, 148, 0.14)']
            ),
    }));

    const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
        opacity: completedReveal.value,
        transform: [{ scale: 0.72 + completedReveal.value * 0.28 }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(animationDelay).springify()}
            style={styles.container}
        >
            <Animated.View style={styles.circle}>
                <Svg width={circleSize} height={circleSize} style={StyleSheet.absoluteFill}>
                    <AnimatedCircle
                        animatedProps={baseCircleAnimatedProps}
                        cx={circleSize / 2}
                        cy={circleSize / 2}
                        r={radius}
                        stroke={isEmpty ? 'rgba(255, 255, 255, 0.26)' : 'rgba(112, 216, 149, 0.24)'}
                        strokeWidth={strokeWidth}
                    />
                    {!isEmpty && (
                        <AnimatedCircle
                            animatedProps={progressCircleAnimatedProps}
                            cx={circleSize / 2}
                            cy={circleSize / 2}
                            r={radius}
                            stroke="#70D895"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeLinecap="round"
                            rotation="-90"
                            originX={circleSize / 2}
                            originY={circleSize / 2}
                        />
                    )}
                </Svg>

                {isComplete && (
                    <AnimatedText style={[styles.checkmark, checkmarkAnimatedStyle]}>
                        ✓
                    </AnimatedText>
                )}
            </Animated.View>
            <Text style={styles.label}>{label}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 42,
        alignItems: 'center',
        gap: 7,
    },
    circle: {
        width: circleSize,
        height: circleSize,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: '#70D895',
        fontFamily: 'Satoshi-Medium',
        fontSize: 27,
        lineHeight: 31,
    },
    label: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Satoshi-Medium',
        fontSize: 14,
    },
});
