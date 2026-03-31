import PopUpContainer from '@/components/popUpContainer';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, Image, Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import DateInput from '../components/dateInput';
import PrimaryButton from '../components/primaryButton';
import { useFont } from '../lib/FontContext';
import { useTheme } from '../lib/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

export default function RestScreen() {
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const router = useRouter();
    const [showCancelModal, setShowCancelModal] = React.useState(false);
    const [restEndDate, setRestEndDate] = React.useState<Date | null>(null);
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const formattedDate = restEndDate ? restEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';

    const fetchRestEndDate = async () => {
        try {
            const { data, error } = await supabase
                .from("Profiles")
                .select("restEndDate")

            const fetchedDate = data?.[0]?.restEndDate ? new Date(data[0].restEndDate) : null;

            setRestEndDate(fetchedDate);
            setSelectedDate(fetchedDate ? fetchedDate : new Date());

            // On retourne la date formatée pour useQuery
            return fetchedDate ? fetchedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
        }
        catch (error) {
            console.error('Erreur lors de la récupération de la date:', error);
            return '';
        }
    }

    useEffect(() => {
        fetchRestEndDate();
        restEndDateQuery.refetch();
    }, []);

    const restEndDateQuery = useQuery({
        queryKey: ['restEndDate'],
        queryFn: fetchRestEndDate,
        gcTime: 1000 * 60 * 5,
        staleTime: 1000 * 60 * 2,
    });

    const step1X = useSharedValue(0);
    const step2X = useSharedValue(screenWidth);

    const handleUnlock = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowCancelModal(true);
    };

    const goToStep2 = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        step1X.value = withSpring(-screenWidth);
        step2X.value = withSpring(0);
    };

    const goBackToStep1 = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        step1X.value = withSpring(0);
        step2X.value = withSpring(screenWidth);
    };

    const step1Style = useAnimatedStyle(() => ({ transform: [{ translateX: step1X.value }] }));
    const step2Style = useAnimatedStyle(() => ({ transform: [{ translateX: step2X.value }] }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* STEP 1 */}
            <Animated.View style={[styles.screen, step1Style]}>
                <View style={styles.content}>

                    {/* Header Titles */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Prends soin</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>de toi</Text>
                    </View>

                    {/* Illustration */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={require('@/assets/images/character/19.png')}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Description paragraphs */}
                    <View style={styles.textContainer}>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            Il est <Text style={[styles.boldText, { color: colors.textSecondary }]}>important</Text> de prendre du{'\n'}
                            temps pour soi et faire des{'\n'}
                            <Text style={[styles.boldText, { color: colors.textSecondary }]}>pauses</Text> de temps en temps
                        </Text>
                    </View>

                    {/* Bottom section with buttons */}
                    <View style={styles.bottomContainer}>
                        <Text style={[styles.untilText, { color: colors.textSecondary }]}>
                            En pause jusqu'au {restEndDateQuery.data}
                        </Text>

                        <View style={styles.buttonsWrapper}>
                            <PrimaryButton
                                title="Débloquer"
                                onPress={handleUnlock}
                            />
                            <View style={{ height: 12 }} />
                            <View style={{ width: '90%', alignSelf: 'center' }}>
                                <PrimaryButton
                                    title="Étendre la pause"
                                    type="reverse"
                                    onPress={goToStep2}
                                />
                            </View>
                        </View>
                    </View>

                </View>
            </Animated.View>

            {/* STEP 2 */}
            <Animated.View style={[styles.screen, step2Style]}>
                <View style={styles.content}>

                    {/* Header Titles */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Donnes toi</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>le temps nécessaire</Text>
                    </View>

                    {/* Input Field */}
                    <View style={{ width: '100%', alignItems: 'flex-start', paddingHorizontal: 20 }}>
                        <Text style={{ fontFamily: 'Satoshi-Medium', fontSize: 18, color: colors.text, marginBottom: 8 }}>
                            Date de fin de pause :
                        </Text>
                        <View style={{ width: '100%', height: 60 }}>
                            <DateInput
                                value={selectedDate}
                                onChange={setSelectedDate}
                            />
                        </View>
                    </View>

                    {/* Bottom section with buttons */}
                    <View style={styles.bottomContainer}>
                        <View style={styles.buttonsWrapper}>
                            <PrimaryButton
                                title="Valider"
                                onPress={async () => {
                                    try {
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (user) {
                                            const { error } = await supabase
                                                .from('Profiles')
                                                .update({ restEndDate: selectedDate })
                                                .eq('id', user.id);

                                            if (error) {
                                                console.error("Erreur lors de la mise à jour de hasDoneDaily:", error);
                                            }
                                        }
                                    } catch (error) {
                                        console.error(error);
                                    } finally {
                                        restEndDateQuery.refetch();
                                        goBackToStep1();
                                    }
                                }}
                            />
                            <View style={{ height: 12 }} />
                            <View style={{ width: '90%', alignSelf: 'center' }}>
                                <PrimaryButton
                                    title="Annuler"
                                    type="reverse"
                                    onPress={async () => {
                                        goBackToStep1();
                                    }}
                                />
                            </View>
                        </View>
                    </View>

                </View>
            </Animated.View>

            <PopUpContainer
                isVisible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                children={
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ overflow: 'hidden', height: 420, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                                <Image
                                    source={require('@/assets/images/character/18.png')}
                                    style={{ width: 120, height: 120 }}
                                    resizeMode="contain"
                                />
                                <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['3xl'], textAlign: 'center' }}>
                                    Repos <Text style={{ fontFamily: 'Satoshi-Bold' }}>terminé</Text> ?
                                </Text>

                                <Text
                                    style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                                >
                                    Tu souhaite annulé ta journée de repos.
                                    Sois conscient que prendre une journée
                                    pour soit est normal voire nécessaire.
                                    Si tu te sens fatigué, reste en pause !
                                </Text>

                            </View>

                            <View
                                style={{
                                    width: '80%',
                                    alignSelf: 'center',
                                    gap: 8,
                                }}
                            >

                                <PrimaryButton
                                    title="Confirmer"
                                    onPress={async () => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (user) {
                                                const { error } = await supabase
                                                    .from('Profiles')
                                                    .update({ restEndDate: null, restMode: false })
                                                    .eq('id', user.id);

                                                if (error) {
                                                    console.error("Erreur lors de l'annulation du mode repos:", error);
                                                }
                                            }
                                        } catch (error) {
                                            console.error(error);
                                        } finally {
                                            restEndDateQuery.refetch();
                                            // setShowCancelModal(false);

                                            // si le router peut back
                                            if (router.canGoBack()) {
                                                router.back();
                                            } else {
                                                router.replace('/');
                                            }
                                        }
                                    }}
                                />
                                <View
                                    style={{
                                        width: '80%',
                                        alignSelf: 'center',
                                    }}
                                >
                                    <PrimaryButton title="Annuler" type="reverse" onPress={() => setShowCancelModal(false)} />
                                </View>
                            </View>

                        </View>
                    </TouchableWithoutFeedback>
                }
            />
        </View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screen: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: screenWidth,
        height: '100%',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
    },
    title: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 48,
    },
    subtitle: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 28,
        marginTop: -4,
    },
    imageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    image: {
        width: width * 0.6,
        height: width * 0.6,
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    description: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 22,
        textAlign: 'center',
        lineHeight: 32,
    },
    boldText: {
        fontFamily: 'Satoshi-Bold',
    },
    bottomContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 40,
    },
    untilText: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 16,
        marginBottom: 20,
    },
    buttonsWrapper: {
        width: '100%',
        alignItems: 'center',
    },
});
