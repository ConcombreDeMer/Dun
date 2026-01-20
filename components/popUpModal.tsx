import { BlurView } from 'expo-blur';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
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
}

export default function PopUpModal({
    isVisible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    symbolName = 'mail'
}: PopUpModalProps) {

    return (

        isVisible &&

        <Animated.View
            entering={FadeInDown.springify().duration(500)}
            exiting={FadeOutDown.springify().duration(500)}
            style={{width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000}}
        >

            <BlurView intensity={20} style={styles.container}>

                <View
                    style={styles.modal}
                >

                    <SymbolView
                        name={symbolName}
                        style={styles.symbol}
                        type="palette"
                        tintColor={'#000000'}
                    />


                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <Text
                            style={styles.title}
                        >
                            {title}
                        </Text>


                        <Text
                            style={styles.message}
                        >
                            {message}
                        </Text>

                    </View>




                    <View
                        style={styles.bottomButtons}
                    >

                        <PrimaryButton
                            onPress={onConfirm}
                            title={confirmText}
                            size='L'
                        />

                        <PrimaryButton
                            onPress={onCancel}
                            title={cancelText}
                            size='L'
                            type='reverse'
                        />

                    </View>

                </View>

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
        backgroundColor: '#00000080',
    },
    modal: {
        width: '95%',
        backgroundColor: '#fff',
        borderRadius: 50,
        alignItems: 'center',
        color: '#000',
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'column',
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginBottom: 10
    },

    symbol: {
        height: 80,
        aspectRatio: 1,
    },

    title: {
        fontSize: 20,
        fontWeight: '600',
    },

    message: {
        fontSize: 14,
        textAlign: 'center',
        color: '#555',


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