import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { ActionButton } from '../../components/actionButton';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export default function ReVerifEmail() {
    const { colors } = useTheme();
    const router = useRouter();
    const [verifEmail, setVerifEmail] = useState<string | null>(null);

    useEffect(() => {
        const getEmail = async () => {
            const email = await AsyncStorage.getItem('verif_email');
            setVerifEmail(email);
        };
        getEmail();
    }, []);

    const handleRetry = () => {
        router.push('/onboarding/emailVerif');
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.clear();
            console.log('AsyncStorage cleared');
        } catch (error) {
            console.error('Error clearing AsyncStorage:', error);
        } finally {
            router.push('/');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>


            <Text>L'email {verifEmail} n'a pas été vérifié</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={handleRetry}

            
            >
                <Text style={{ color: colors.actionButton }}>Ressayer la vérification ?</Text>

            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogout}
            >
                <Text style={{ color: colors.actionButton }}>Se déconnecter</Text>
            </TouchableOpacity>
            



        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '80%',
        display: 'flex',
        paddingVertical: 100,

    },
    button:{
        marginTop: 20,
        backgroundColor: '#939393ff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    }
});
