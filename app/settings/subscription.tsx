import Headline from '@/components/headline';
import NavItem from '@/components/navItem';
import PopUpContainer from '@/components/popUpContainer';
import PrimaryButton from '@/components/primaryButton';
import SecondaryButton from '@/components/secondaryButton';
import SettingItem from '@/components/settingItem';
import SwitchItem from '@/components/switchItem';
import { useFont } from '@/lib/FontContext';
import { getCharacterImageSource } from '@/lib/imageHelper';
import { useAppTranslation } from '@/lib/i18n';
import { useSubscription } from '@/lib/subscription';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { SquircleButton, SquircleView } from 'expo-squircle-view';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Image, Keyboard, Text, TouchableWithoutFeedback, View } from 'react-native';

export default function Subscription() {
    const { colors, actualTheme } = useTheme();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const {
        activeEntitlement,
        isPremium,
        packages,
        showManageSubscriptions,
    } = useSubscription();

    const activePackage = useMemo(() => {
        const productIdentifier = activeEntitlement?.productIdentifier;
        return [packages.monthly, packages.annual].find((pack) => pack?.product.identifier === productIdentifier);
    }, [activeEntitlement?.productIdentifier, packages.annual, packages.monthly]);

    const formatDate = (date?: string | null) => {
        if (!date) {
            return t("settings.subscription.unavailable");
        }

        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(date));
    };

    const getPeriodicity = () => {
        if (activePackage?.packageType === "MONTHLY") {
            return t("settings.subscription.monthly");
        }

        if (activePackage?.packageType === "ANNUAL") {
            return t("settings.subscription.annual");
        }

        return t("settings.subscription.unavailable");
    };


    const cancelSubscription = () => {
        setShowCancelModal(false);
        void showManageSubscriptions();
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
                        !isPremium ? (
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
                                    source={getCharacterImageSource('16', actualTheme)}
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
                        isPremium && (

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
                                                style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>{formatDate(activeEntitlement?.latestPurchaseDate)}</Text>
                                        }
                                    />
                                    <SettingItem
                                        title={t("settings.subscription.endDate")}
                                        rightContent={
                                            <Text
                                                style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>{formatDate(activeEntitlement?.expirationDate)}</Text>

                                        }
                                    />
                                    <SettingItem
                                        title={t("settings.subscription.periodicity")}
                                        rightContent={
                                            <Text style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>{getPeriodicity()}</Text>

                                        }
                                    />
                                    <SettingItem
                                        title={t("settings.subscription.price")}
                                        rightContent={
                                            <Text style={{ color: colors.text, fontFamily: 'Satoshi-Bold', fontSize: fontSizes.base }}>{activePackage?.product.priceString ?? t("settings.subscription.unavailable")}</Text>

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
                        !isPremium ? (

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
