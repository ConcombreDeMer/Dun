import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function ProgressBar({ progress }: {
    progress: number;
}) {
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
            <View style={styles.container}>
                <Animated.View
                    style={[styles.filler, { width: widthInterpolation }]}
                />
            </View>
            <Text style={styles.label}>
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
        backgroundColor: '#e0e0de',
        borderRadius: 10,
        overflow: 'hidden',
    },
    filler: {
        height: '100%',
        backgroundColor: '#272727ff',
        borderRadius: 10,
    },
    label: {
        fontWeight: '300',
        fontSize: 16,
        width: '15%',
        textAlign: 'right',
    },
});