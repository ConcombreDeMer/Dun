import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useFont } from '../lib/FontContext';
import { useTheme } from '../lib/ThemeContext';

type ProgressBarProps = {
    progress: number;
};

function ProgressBar({ progress }: ProgressBarProps) {
    const { actualTheme, colors } = useTheme();
    const { fontSizes } = useFont();
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
    const animatedProgress = useSharedValue(clampedProgress);
    const palette = useMemo(() => {
        const isDark = actualTheme === 'dark';

        return {
            fill: isDark ? '#42E690' : '#08E18B',
            track: isDark ? 'rgba(92, 255, 173, 0.13)' : 'rgba(8, 225, 139, 0.13)',
        };
    }, [actualTheme]);

    useEffect(() => {
        animatedProgress.value = withTiming(clampedProgress, {
            duration: 220,
            easing: Easing.out(Easing.quad),
        });
    }, [animatedProgress, clampedProgress]);

    const fillStyle = useAnimatedStyle(() => {
        return {
            width: `${animatedProgress.value}%`,
        };
    });

    return (
        <View style={styles.root}>
            <View style={[styles.track, { backgroundColor: palette.track, borderColor: colors.border }]}>
                <Animated.View
                    style={[
                        styles.fill,
                        { backgroundColor: palette.fill },
                        fillStyle,
                    ]}
                />
            </View>
            <Text style={[styles.label, { color: colors.text, fontSize: fontSizes.lg }]}>
                {clampedProgress}%
            </Text>
        </View>
    );
}

export default memo(ProgressBar);

const styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        marginTop: 10,
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    track: {
        flex: 1,
        height: 18,
        borderRadius: 9,
        borderWidth: 0.5,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 9,
    },
    label: {
        width: 48,
        fontWeight: '300',
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
    },
});
