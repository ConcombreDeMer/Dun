import Headline from '@/components/headline';
import NavItem from '@/components/navItem';
import PopUpContainer from '@/components/popUpContainer';
import PrimaryButton from '@/components/primaryButton';
import SecondaryButton from '@/components/secondaryButton';
import SettingItem from '@/components/settingItem';
import SwitchItem from '@/components/switchItem';
import { router } from 'expo-router';
import { SquircleButton, SquircleView } from 'expo-squircle-view';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, Keyboard, Text, TouchableWithoutFeedback, View } from 'react-native';
import { useFont } from '../../lib/FontContext';
import { useTheme } from '../../lib/ThemeContext';

type SubscriptionStatus = "None" | "prem" | "other";

export default function Subscription() {
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const [showCancelModal, setShowCancelModal] = useState(false);

    const etatAbonnement = "prem" as SubscriptionStatus;

    return (

        <View
            style={{
                backgroundColor: colors.background,
                display: 'flex',
                height: '100%',
                flexDirection: 'column',
                width: '100%',
            }}
        >

            <View

                style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    paddingHorizontal: 20,
                    gap: 20,
                }}
            >


                <View
                    style={{
                        marginBottom: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 20,
                        paddingTop: 60
                    }}
                >
                    <SecondaryButton
                        onPress={() => router.back()}
                        image="chevron.left"
                    />
                    <Headline title="Gestion" subtitle="de l'abonnement" />
                </View>

                <View
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Text
                        style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                    >
                        ÉTAT
                    </Text>
                    {
                        etatAbonnement === "None" ? (
                            <SquircleView
                                style={{
                                    backgroundColor: colors.card,
                                    padding: 20,
                                    borderRadius: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexDirection: 'row',
                                }}
                            >
                                <View
                                    style={{ width: '70%' }}
                                >
                                    <Text
                                        style={{ color: colors.text, fontSize: fontSizes.lg, padding: 20, fontFamily: 'Satoshi-Regular' }}
                                    >
                                        Aucun abonnement actif.
                                    </Text>
                                </View>

                                <SymbolView
                                    name="xmark.circle.fill"
                                    tintColor={colors.actionButton}
                                    size={100}
                                />
                            </SquircleView>
                        ) : (
                            <SquircleButton
                                style={{
                                    height: 150,
                                    borderRadius: 20,
                                    justifyContent: "space-between",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: "#FFDB7F",
                                    backgroundColor: "#FFE39C",
                                }}
                                onPress={() => router.push("/settings/premium")}
                            >

                                <View
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 10,
                                        marginBottom: 10,
                                        marginLeft: 20,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: colors.text,
                                            fontSize: fontSizes['6xl'],
                                            fontFamily: 'Satoshi-Black',
                                        }}
                                    >
                                        Dun
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#FFBB00",
                                            fontSize: fontSizes['7xl'],
                                            fontFamily: 'Satoshi-Black',
                                        }}
                                    >
                                        +
                                    </Text>
                                </View>


                                <Image
                                    source={require("../../assets/images/character/16.png")}
                                    style={{
                                        position: "relative",
                                        height: 120,
                                        width: 120,
                                        aspectRatio: 1,
                                        alignSelf: "flex-end",
                                        marginBottom: 10,
                                        marginRight: 20,
                                    }}
                                />

                            </SquircleButton>
                        )
                    }


                    {
                        etatAbonnement !== "None" && (

                            <View
                                style={{ display: 'flex', gap: 8, marginTop: 10 }}
                            >
                                <Text
                                    style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                                >
                                    INFORMATIONS
                                </Text>


                                <SquircleView
                                    style={{
                                        backgroundColor: colors.card,
                                        borderRadius: 16,
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <SettingItem
                                        title="Date de début"
                                        rightContent={
                                            <Text
                                                style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>TEST</Text>
                                        }
                                    />
                                    <SettingItem
                                        title="Date de fin"
                                        rightContent={
                                            <Text
                                            style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>TEST</Text>

                                        }
                                    />
                                    <SettingItem
                                        title="Périodicité"
                                        rightContent={
                                            <Text style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>TEST</Text>

                                        }
                                    />
                                    <SettingItem
                                        title="Prix"
                                        rightContent={
                                            <Text style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>TEST</Text>

                                        }
                                    />
                                </SquircleView>

                            </View>
                        )
                    }



                </View>

                <View
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Text
                        style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                    >
                        GESTION
                    </Text>
                    {
                        etatAbonnement === "None" ? (

                            <SquircleView>
                                <NavItem title="Débuter un abonnement" onPress={() => router.push("/settings/premium")} />
                            </SquircleView>

                        ) : (

                            <SquircleView
                                style={{ display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: colors.card, borderRadius: 20, paddingBottom: 24 }}

                            >
                                <View
                                    style={{ paddingHorizontal: 23, alignSelf: 'center', width: '100%' }}
                                >
                                    <SwitchItem
                                        title="Renouvellement automatique"
                                    // event={setWeekendEnabled}
                                    // currentValue={weekendEnabled}
                                    />

                                </View>
                                <NavItem title="Annuler l'abonnement" onPress={() => setShowCancelModal(true)} transparent />

                            </SquircleView>
                        )
                    }
                </View>



            </View>
            <PopUpContainer
                isVisible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                children={
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ overflow: 'hidden', height: 400, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', paddingHorizontal: 20 }}>
                                <SymbolView name="exclamationmark.triangle.fill" weight="semibold" size={120} tintColor="#000000" />
                                <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['xl'], textAlign: 'center' }}>
                                    Vous êtes sur le point de résilier votre abonnement à <Text style={{ fontFamily: 'Satoshi-Bold' }}>Dun +</Text>.
                                </Text>

                                <Text
                                    style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                                >
                                    En cas de confirmation, celui ci prendra fin le <Text style={{ fontFamily: 'Satoshi-Bold' }}> date</Text>, les services premium ne vous seront plus accessibles passé cette date.
                                </Text>

                            </View>

                            <PrimaryButton
                                title="Confirmer"
                                onPress={() => setShowCancelModal(false)}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                }
            />
        </View>

    )
}