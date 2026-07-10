import NavItem from "@/components/navItem";
import PopUpContainer from "@/components/popUpContainer";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import Squircle from "@/components/Squircle";
import SwitchItem from "@/components/switchItem";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { getCharacterImageSource } from "@/lib/imageHelper";
import { patchProfileCache } from "@/lib/profile";
import { SCREEN_HEADER_HEIGHT, SCREEN_HEADER_HORIZONTAL_PADDING, SCREEN_HEADER_TITLE_LINE_HEIGHT, SCREEN_HEADER_TOP_OFFSET } from "@/lib/screenHeader";
import { useSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Image,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View
} from "react-native";
import Purchases from "react-native-purchases";


export default function Settings() {
    const router = useRouter();
    const { colors, actualTheme } = useTheme();
    const { fontSizes } = useFont();
    const { t } = useAppTranslation();
    const { isPremium, isLoading: isSubscriptionLoading } = useSubscription();
    const queryClient = useQueryClient();
    const [user, setUser] = useState<any>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [dailyEnabled, setDailyEnabled] = useState(false);
    const [lockPastDaysEnabled, setLockPastDaysEnabled] = useState(true);
    const [showReposModal, setShowReposModal] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                // 1. Charger l'utilisateur
                const { data: { user } } = await supabase.auth.getUser();
                if (user && isMounted) {
                    setUser(user);
                }

                // 2. Vérifier l'abonnement RevenueCat
                const customerInfo = await Purchases.getCustomerInfo();
                // ATTENTION: Il faut utiliser le vrai "Identifier" ici, pas le "Display Name".
                // Si lors de la création vous avez mis "Dun Pro" comme Identifier, gardez-le.
                // S'il ne marche pas, essayez en minuscules sans espace (ex: dun_pro)
                if (typeof customerInfo.entitlements.active['dun_plus'] !== "undefined") {
                    console.log("Le user est abonné !");
                    if (isMounted) setIsSubscribed(true);
                } else {
                    console.log("Le user n'est pas abonné.");
                    if (isMounted) setIsSubscribed(false);
                }
            } catch (error) {
                console.error("Erreur de chargement:", error);
            } finally {
                if (isMounted) {
                    fetchInformation();
                }
            }
        };


        loadContent();

        return () => {
            isMounted = false;
        };
    }, []);


    const fetchInformation = async () => {
        if (user) {
            const { data, error } = await supabase
                .from("Profiles")
                .select("dailyEnabled, lockPastDaysEnabled")
                .eq("id", user.id)
                .single();
            if (error) {
                console.error("Erreur lors de la récupération des informations de l'utilisateur:", error);
            } else {
                console.log("Informations de l'utilisateur récupérées:", data);
                setDailyEnabled(data.dailyEnabled);
                setLockPastDaysEnabled(data.lockPastDaysEnabled ?? true);
            }
        }
    };

    useEffect(() => {
        if (user) {
            fetchInformation();
        }
    }, [user]);

    const updateDaily = useCallback(async (value: boolean) => {
        if (user) {
            setDailyEnabled(value);
            const { error } = await supabase
                .from("Profiles")
                .update({ dailyEnabled: value })
                .eq("id", user.id);
            if (error) {
                console.error("Erreur lors de la mise à jour des informations de l'utilisateur:", error);
                setDailyEnabled(!value);
            } else {
                patchProfileCache(queryClient, user.id, { dailyEnabled: value });
                console.log("Informations de l'utilisateur mises à jour avec succès");
            }
        }
    }, [queryClient, user]);

    const toggleDaily = async (value: boolean) => {
        if (!value && !isPremium) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings/premium");
            return;
        }

        await updateDaily(value);
    };

    const updatePastDaysLock = useCallback(async (value: boolean) => {
        if (user) {
            setLockPastDaysEnabled(value);
            const { error } = await supabase
                .from("Profiles")
                .update({ lockPastDaysEnabled: value })
                .eq("id", user.id);
            if (error) {
                console.error("Erreur lors de la mise à jour du verrouillage des jours passés:", error);
                setLockPastDaysEnabled(!value);
            } else {
                patchProfileCache(queryClient, user.id, { lockPastDaysEnabled: value });
                console.log("Verrouillage des jours passés mis à jour avec succès");
            }
        }
    }, [queryClient, user]);

    const togglePastDaysLock = async (value: boolean) => {
        if (!value && !isPremium) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings/premium");
            return;
        }

        const title = value
            ? t("settings.root.lockPastDaysAlert.enableTitle")
            : t("settings.root.lockPastDaysAlert.disableTitle");
        const message = value
            ? t("settings.root.lockPastDaysAlert.enableMessage")
            : t("settings.root.lockPastDaysAlert.disableMessage");

        Alert.alert(
            title,
            message,
            [
                {
                    text: t("common.actions.cancel"),
                    style: "cancel",
                },
                {
                    text: t("common.actions.confirm"),
                    style: value ? "default" : "destructive",
                    onPress: () => {
                        void updatePastDaysLock(value);
                    },
                },
            ]
        );
    };

    useEffect(() => {
        if (isSubscriptionLoading || isPremium || lockPastDaysEnabled || !user) {
            return;
        }

        void updatePastDaysLock(true);
    }, [isPremium, isSubscriptionLoading, lockPastDaysEnabled, updatePastDaysLock, user]);

    useEffect(() => {
        if (isSubscriptionLoading || isPremium || dailyEnabled || !user) {
            return;
        }

        void updateDaily(true);
    }, [dailyEnabled, isPremium, isSubscriptionLoading, updateDaily, user]);

    const handleRestMode = async () => {
        // setShowReposModal(false);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('Profiles')
                    .update({ restMode: true, restEndDate: tomorrow })
                    .eq('id', user.id);

                if (error) {
                    console.error("Erreur lors de la mise à jour de hasDoneDaily:", error);
                } else {
                    patchProfileCache(queryClient, user.id, {
                        restMode: true,
                        restEndDate: tomorrow.toISOString(),
                    });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setShowReposModal(false);
            router.push('/rest');
        }
    }

    const handleBack = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/stats");
    };




    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* <Headline title="Paramètres" subtitle="de l'application" /> */}
            <View
                style={{
                    width: '100%',
                    height: '100%',
                    paddingLeft: SCREEN_HEADER_HORIZONTAL_PADDING,
                    paddingRight: SCREEN_HEADER_HORIZONTAL_PADDING,
                    paddingTop: SCREEN_HEADER_TOP_OFFSET,
                }}
            >

                <View style={styles.topBar}>
                    <SecondaryButton
                        image="chevron.left"
                        imageSize={24}
                        onPress={handleBack}
                    />
                    <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["3xl"] }]}>
                        {t("navigation.settings")}
                    </Text>
                    <View style={styles.topBarSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {
                        !isSubscribed && (

                            <SquircleButton
                                style={{
                                    position: "relative",
                                    height: 150,
                                    borderRadius: 30,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: "#FFDB7F",
                                    backgroundColor: "#FFE39C",
                                    marginBottom: 12,
                                }}
                                onPress={() => router.push("/settings/premium")}
                            >

                                <View
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        position: "absolute",
                                        top: 20,
                                        left: 20,
                                    }}
                                >
                                    <View
                                        style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 10,
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

                                    <Text
                                        style={{
                                            color: colors.text,
                                            fontSize: fontSizes.lg,
                                            fontFamily: 'Satoshi-Medium',
                                            opacity: 0.3,
                                            marginTop: -6,
                                        }}
                                    >
                                        {t("settings.root.premiumTagline")}
                                    </Text>

                                </View>



                                <Image
                                    source={getCharacterImageSource('16', actualTheme)}
                                    style={{
                                        height: '90%',
                                        aspectRatio: 1,
                                        alignSelf: "flex-end",
                                    }}
                                />





                            </SquircleButton>
                        )
                    }

                    <NavItem image="person.fill" title={t("settings.root.account")} onPress={() => router.push("/settings/account")} />
                    <NavItem image="bell.fill" title={t("settings.root.notifications")} onPress={() => router.push("/settings/notifications")} />
                    <NavItem image="display" title={t("settings.root.display")} onPress={() => router.push("/settings/display")} />
                    <NavItem image="tag.fill" title={t("settings.root.tags")} onPress={() => router.push("/settings/tags")} />

                    <View
                        style={{
                            width: '80%',
                            backgroundColor: "#050505",
                            height: 2,
                            marginVertical: 24,
                            alignSelf: "center",
                            opacity: 0.2,
                            borderRadius: 10,
                        }}
                    >
                    </View>

                    <View style={styles.premiumSettingContainer}>


                        {!isPremium ? (
                            <View style={styles.plusBadge}>
                                <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                            </View>
                        ) : null}
                        <Squircle
                            style={{
                                width: '100%',
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                borderRadius: 15,
                                paddingHorizontal: 24,
                                height: 64,
                            }}
                            cornerSmoothing={100} // 0-100
                            preserveSmoothing={true} // false matches figma, true has more rounding
                        >
                            <SwitchItem
                                image="list.clipboard.fill"
                                title={t("settings.root.daily")}
                                event={toggleDaily}
                                currentValue={dailyEnabled}
                            />

                        </Squircle>
                    </View>
                    <View style={styles.premiumSettingContainer}>
                        {!isPremium ? (
                            <View style={styles.plusBadge}>
                                <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                            </View>
                        ) : null}
                        <Squircle
                            style={{
                                width: '100%',
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                borderRadius: 15,
                                paddingHorizontal: 24,
                                height: 64,
                            }}
                            cornerSmoothing={100}
                            preserveSmoothing={true}
                        >
                            <SwitchItem
                                image="lock.fill"
                                title={t("settings.root.lockPastDays")}
                                event={togglePastDaysLock}
                                currentValue={lockPastDaysEnabled}
                            />
                        </Squircle>
                    </View>

                    <View style={styles.premiumSettingContainer}>
                        {!isPremium ? (
                            <View style={styles.plusBadge}>
                                <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                            </View>
                        ) : null}
                        <NavItem image="powersleep" title={t("settings.root.rest")} onPress={() => {
                            if (!isPremium) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push("/settings/premium");
                                return;
                            }

                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowReposModal(true);
                        }} />
                    </View>

                </ScrollView>


            </View>

            <PopUpContainer
                isVisible={showReposModal}
                onClose={() => setShowReposModal(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ overflow: 'hidden', height: 420, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                        <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                            <Image
                                source={getCharacterImageSource('19', actualTheme)}
                                style={{ width: 120, height: 120 }}
                                resizeMode="contain"
                            />
                            <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['3xl'], textAlign: 'center' }}>
                                {t("settings.root.restModalTitle")}
                            </Text>

                            <Text
                                style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                            >
                                {t("settings.root.restModalDescription")}
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
                                title={t("common.actions.confirm")}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleRestMode();
                                }}
                            />
                            <View
                                style={{
                                    width: '80%',
                                    alignSelf: 'center',
                                }}
                            >
                                <PrimaryButton title={t("common.actions.cancel")} type="reverse" onPress={() => setShowReposModal(false)} />
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </PopUpContainer>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        backgroundColor: "#fff",
    },

    topBar: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
        minHeight: SCREEN_HEADER_HEIGHT,
        width: "100%",
    },
    title: {
        fontFamily: "Satoshi-Bold",
        lineHeight: SCREEN_HEADER_TITLE_LINE_HEIGHT,
    },
    topBarSpacer: {
        height: 48,
        width: 48,
    },

    scrollContent: {
        marginTop: 12,
        paddingBottom: 120,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingRight: 8,
        paddingLeft: 8,
    },
    premiumSettingContainer: {
        overflow: "visible",
        paddingTop: 8,
        position: "relative",
        width: "100%",
    },
    plusBadge: {
        alignItems: "center",
        backgroundColor: "#F4BA00",
        borderRadius: 999,
        height: 28,
        justifyContent: "center",
        position: "absolute",
        right: 0,
        top: 0,
        width: 28,
        zIndex: 2,
    },


});
