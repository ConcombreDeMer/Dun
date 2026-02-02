import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useFont } from '../lib/FontContext';
import { useTheme } from '../lib/ThemeContext';

export default function ProgressBar({ progress }: {
    progress: number;
}) {
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const animatedWidth = useRef(new Animated.Value(progress)).current;

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: progress,
            duration: 400,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const widthInterpolation = useMemo(() =>
        animatedWidth.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
        }),
        [animatedWidth]
    );


    return (
        <View style={styles.progressBarContainer}>
            <View style={[styles.container, { backgroundColor: colors.border }]}>
                <Animated.View
                    style={[styles.filler, { width: widthInterpolation, backgroundColor: colors.text }]}
                />
            </View>
            <Text style={[styles.label, { color: colors.text, fontSize: fontSizes.lg }]}>
                {Math.round(progress)}%
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({

    progressBarContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    container: {
        height: 20,
        width: '85%',
        borderRadius: 10,
        overflow: 'hidden',
    },
    filler: {
        height: '100%',
        borderRadius: 10,
    },
    label: {
        fontWeight: '300',
        width: '15%',
        textAlign: 'right',
    },
});