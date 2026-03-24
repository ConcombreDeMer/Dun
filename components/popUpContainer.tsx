import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTheme } from '../lib/ThemeContext';
import Squircle from './Squircle';

interface PopUpContainerProps {
    isVisible: boolean;
    children?: React.ReactNode;
    onClose?: () => void;
}

export default function PopUpContainer({
    isVisible,
    children,
    onClose,
}: PopUpContainerProps) {
    const { colors } = useTheme();

    return (

        isVisible &&

        <Animated.View
            entering={FadeIn.springify().duration(500)}
            exiting={FadeOut.springify().duration(500)}
            style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
        >

            <BlurView intensity={20} style={[styles.container, { backgroundColor: colors.text + '80' }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <Squircle
                    entering={SlideInDown.springify().duration(900)}
                    exiting={SlideOutDown.springify().duration(900)}
                    style={[styles.modal, { backgroundColor: colors.background, borderColor: colors.border, padding: 20 }]}
                >
                    {children}
                </Squircle>

            </BlurView>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        width: '95%',
        backgroundColor: 'transparent',
        borderRadius: 50,
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'column',
        borderWidth: 1,
    }
});