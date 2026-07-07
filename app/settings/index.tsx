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
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { useEffect, useState } from "react";
import {
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
    const queryClient = useQueryClient();
    const [user, setUser] = useState<any>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [dailyEnabled, setDailyEnabled] = useState(false);
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
                .select("dailyEnabled")
                .eq("id", user.id)
                .single();
            if (error) {
                console.error("Erreur lors de la récupération des informations de l'utilisateur:", error);
            } else {
                console.log("Informations de l'utilisateur récupérées:", data);
                setDailyEnabled(data.dailyEnabled);
            }
        }
    };

    useEffect(() => {
        if (user) {
            fetchInformation();
        }
    }, [user]);

    const toggleDaily = async () => {
        if (user) {
            const newValue = !dailyEnabled;
            setDailyEnabled(newValue);
            const { error } = await supabase
                .from("Profiles")
                .update({ dailyEnabled: newValue })
                .eq("id", user.id);
            if (error) {
                console.error("Erreur lors de la mise à jour des informations de l'utilisateur:", error);
            } else {
                patchProfileCache(queryClient, user.id, { dailyEnabled: newValue });
                console.log("Informations de l'utilisateur mises à jour avec succès");
            }
        }
    };

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

                    <NavItem image="person.fill" title={t("settings.root.account")} onPress={() => router.push("/settings/account")} />
                    <NavItem image="bell.fill" title={t("settings.root.notifications")} onPress={() => router.push("/settings/notifications")} />
                    <NavItem image="display" title={t("settings.root.display")} onPress={() => router.push("/settings/display")} />
                    <NavItem image="tag.fill" title={t("settings.root.tags")} onPress={() => router.push("/settings/tags")} />
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

                    <NavItem image="powersleep" title={t("settings.root.rest")} onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowReposModal(true);
                    }} />

                </ScrollView>


                {
                    !isSubscribed && (

                        <SquircleButton
                            style={{
                                position: "absolute",
                                bottom: 120,
                                left: 20,
                                right: 20,
                                height: 150,
                                borderRadius: 30,
                                justifyContent: "center",
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
    },


});
