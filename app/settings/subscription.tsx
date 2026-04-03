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
import { useEffect, useState } from 'react';
import { Image, Keyboard, Platform, Text, TouchableWithoutFeedback, View } from 'react-native';
import Purchases from 'react-native-purchases';
import { useFont } from '../../lib/FontContext';
import { useAppTranslation } from '../../lib/i18n';
import { useTheme } from '../../lib/ThemeContext';

type SubscriptionStatus = "None" | "prem" | "other";

export default function Subscription() {
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isSubscribed, setIsSubscribed ]= useState(false);

    useEffect(() => {

        const checkSubscription = async () => {
            const customerInfo = await Purchases.getCustomerInfo();

            // On vérifie si l'utilisateur possède l'accès 'pro'
            // (assurez-vous d'utiliser le bon id 'Dun Pro' ou 'pro' selon ce que vous avez mis)
            if (typeof customerInfo.entitlements.active['Dun Pro'] !== "undefined") {
                setIsSubscribed(true);
            } else {
                setIsSubscribed(false);
            }
        }

        checkSubscription();
    }, []);


    const cancelSubscription = () => {
        // redirect user to the appropriate store to manage their subscription
        if (Platform.OS === 'ios') {
            Purchases.showManageSubscriptions();
        }
    }


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
                    <Headline title={t("settings.subscription.headline.title")} subtitle={t("settings.subscription.headline.subtitle")} />
                </View>

                <View
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Text
                        style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                    >
                        {t("settings.subscription.status")}
                    </Text>
                    {
                        !isSubscribed ? (
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
                                        {t("settings.subscription.none")}
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
                        isSubscribed && (

                            <View
                                style={{ display: 'flex', gap: 8, marginTop: 10 }}
                            >
                                <Text
                                    style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                                >
                                    {t("settings.subscription.informations")}
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
                                        title={t("settings.subscription.startDate")}
                                        rightContent={
                                            <Text
                                                style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>TEST</Text>
                                        }
                                    />
                                    <SettingItem
                                        title={t("settings.subscription.endDate")}
                                        rightContent={
                                            <Text
                                                style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>TEST</Text>

                                        }
                                    />
                                    <SettingItem
                                        title={t("settings.subscription.periodicity")}
                                        rightContent={
                                            <Text style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>TEST</Text>

                                        }
                                    />
                                    <SettingItem
                                        title={t("settings.subscription.price")}
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
                        {t("settings.subscription.management")}
                    </Text>
                    {
                        !isSubscribed ? (

                            <SquircleView>
                                <NavItem title={t("settings.subscription.startSubscription")} onPress={() => router.push("/settings/premium")} />
                            </SquircleView>

                        ) : (

                            <SquircleView
                                style={{ display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: colors.card, borderRadius: 20, paddingBottom: 24 }}

                            >
                                <View
                                    style={{ paddingHorizontal: 23, alignSelf: 'center', width: '100%' }}
                                >
                                    <SwitchItem
                                        title={t("settings.subscription.autoRenewal")}
                                    // event={setWeekendEnabled}
                                    // currentValue={weekendEnabled}
                                    />

                                </View>
                                <NavItem title={t("settings.subscription.cancelSubscription")} onPress={() => setShowCancelModal(true)} transparent />

                            </SquircleView>
                        )
                    }
                </View>



            </View>
            <PopUpContainer
                isVisible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ overflow: 'hidden', height: 400, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                        <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', paddingHorizontal: 20 }}>
                            <SymbolView name="exclamationmark.triangle.fill" weight="semibold" size={120} tintColor="#000000" />
                            <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['xl'], textAlign: 'center' }}>
                                {t("settings.subscription.cancelModalTitle")}
                            </Text>

                            <Text
                                style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                            >
                                {t("settings.subscription.cancelModalDescription")}
                            </Text>

                        </View>

                        <PrimaryButton
                            title={t("common.actions.confirm")}
                            onPress={cancelSubscription}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </PopUpContainer>
        </View>

    )
}
