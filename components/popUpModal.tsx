import { BlurView } from 'expo-blur';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useFont } from '../lib/FontContext';
import { useTheme } from '../lib/ThemeContext';
import PrimaryButton from './primaryButton';

interface PopUpModalProps {
    isVisible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    symbolName?: SFSymbol;
    withNavbar?: boolean;
}

export default function PopUpModal({
    isVisible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
    symbolName,
    withNavbar = false,
}: PopUpModalProps) {
    const { colors } = useTheme();
    const { fontSizes } = useFont();

    return (

        isVisible &&

        <Animated.View
            entering={FadeIn.springify().duration(500)}
            exiting={FadeOut.springify().duration(500)}
            style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
        >

            <BlurView intensity={20} style={[styles.container, { backgroundColor: colors.text + '80' }]}>

                <Animated.View
                    entering={SlideInDown.springify().duration(900)}
                    exiting={SlideOutDown.springify().duration(900)}
                    style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border, paddingTop: 20, paddingBottom: withNavbar ? 100 : 20 }]}
                >

                    {
                        symbolName && (

                            <SymbolView
                                name={symbolName}
                                style={styles.symbol}
                                type="palette"
                                tintColor={colors.text}
                            />

                        )
                    }



                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <Text
                            style={[styles.title, { color: colors.text, fontSize: fontSizes['2xl'] }]}
                        >
                            {title}
                        </Text>


                        <Text
                            style={[styles.message, { color: colors.textSecondary, fontSize: fontSizes.base }]}
                        >
                            {message}
                        </Text>

                    </View>




                    <View
                        style={styles.bottomButtons}
                    >

                        {
                            confirmText && (

                                <PrimaryButton
                                    onPress={onConfirm}
                                    title={confirmText}
                                    size='L'
                                />
                            )
                        }

                        {
                            cancelText && (
                                <PrimaryButton
                                    onPress={onCancel}
                                    title={cancelText}
                                    size='L'
                                    type='reverse'
                                />
                            )
                        }



                    </View>

                </Animated.View>

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
        justifyContent: 'flex-end',
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
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginBottom: 10,
        borderWidth: 1,
    },

    symbol: {
        height: 80,
        aspectRatio: 1,
    },

    title: {
        fontWeight: '600',
    },

    message: {
        textAlign: 'center',
    },

    bottomButtons: {
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        marginTop: 40,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        backgroundColor: '#eee',
    },
});