import { View, StyleSheet, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { useColorScheme } from 'react-native';

interface BottomDualButtonsProps {
    leftButtonTitle: string;
    rightButtonTitle: string;
    onPressLeft: () => void;
    onPressRight: () => void;
    leftButtonDisabled?: boolean;
    rightButtonDisabled?: boolean;
    style?: ViewStyle;
}

export default function BottomDualButtons({
    leftButtonTitle,
    rightButtonTitle,
    onPressLeft,
    onPressRight,
    leftButtonDisabled = false,
    rightButtonDisabled = false,
    style
}: BottomDualButtonsProps) {
    const colorScheme = useColorScheme();
    
    return (
        <View style={[styles.container, style]}>
            <TouchableOpacity
                style={[styles.button, leftButtonDisabled && styles.disabled]}
                onPress={onPressLeft}
                disabled={leftButtonDisabled}
            >
                <Text style={[styles.buttonText, colorScheme === 'dark' && styles.darkText]}>
                    {leftButtonTitle}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, rightButtonDisabled && styles.disabled]}
                onPress={onPressRight}
                disabled={rightButtonDisabled}
            >
                <Text style={[styles.buttonText, colorScheme === 'dark' && styles.darkText]}>
                    {rightButtonTitle}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    darkText: {
        color: '#FFFFFF',
    },
    disabled: {
        opacity: 0.5,
    },
});
