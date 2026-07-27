import OnboardingButton from "@/components/onboarding/OnboardingButton";
import SubscriptionPlanOption from "@/components/SubscriptionPlanOption";
import { useAppTranslation } from "@/lib/i18n";
import { TrialEligibilityStatus, useSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, {
    Easing,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type PremiumPlan = "annual" | "monthly";

export default function Premium() {
    const router = useRouter();
    const { t } = useAppTranslation();
    const { required } = useLocalSearchParams<{ required?: string }>();
    const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
    const [trialEligibility, setTrialEligibility] = useState<TrialEligibilityStatus>("unknown");
    const isRequiredPaywall = required === "1";
    const {
        checkTrialEligibility,
        isLoading,
        isPurchasing,
        loadOfferings,
        packages,
        purchasePackage,
    } = useSubscription();
    const selectedPackage = selectedPlan === "annual"
        ? packages.annual
        : selectedPlan === "monthly"
        ? packages.monthly
        : undefined;
    const hasAvailablePackages = Boolean(packages.monthly || packages.annual);
    const shouldShowOfferStatus = isLoading || !hasAvailablePackages || !selectedPackage;
    const trialEligibilityProductIdentifier =
        selectedPackage?.product.identifier ??
        packages.annual?.product.identifier ??
        packages.monthly?.product.identifier;
    const trialText = trialEligibility === "ineligible"
        ? "Période d’essai expirée"
        : "Débloquer la période d’essai 14j";

    const closeAfterPremiumAccess = () => {
        if (isRequiredPaywall) {
            router.replace("/");
            return;
        }

        router.back();
    };

    useEffect(() => {
        void loadOfferings();
    }, [loadOfferings]);

    useEffect(() => {
        if (selectedPlan === "monthly" && packages.monthly) {
            return;
        }

        if (selectedPlan === "annual" && packages.annual) {
            return;
        }

        if (packages.monthly) {
            setSelectedPlan("monthly");
            return;
        }

        if (packages.annual) {
            setSelectedPlan("annual");
            return;
        }

        setSelectedPlan(null);
    }, [packages.annual, packages.monthly, selectedPlan]);

    useEffect(() => {
        const productIdentifier = trialEligibilityProductIdentifier;

        if (!productIdentifier) {
            setTrialEligibility("unknown");
            return;
        }

        let isCancelled = false;

        void checkTrialEligibility(productIdentifier).then((status) => {
            if (!isCancelled) {
                setTrialEligibility(status);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [checkTrialEligibility, trialEligibilityProductIdentifier]);

    const buyPremium = async () => {
        if (!selectedPackage) {
            void loadOfferings();
            return;
        }

        try {
            const hasPremium = await purchasePackage(selectedPackage);

            if (hasPremium) {
                Alert.alert(t("settings.premium.purchaseSuccessTitle"), t("settings.premium.purchaseSuccessMessage"));
                closeAfterPremiumAccess();
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                Alert.alert(t("settings.premium.purchaseErrorTitle"), e.message || t("common.alerts.genericError"));
            }
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Déconnexion",
            "Tu veux te déconnecter de ce compte ?",
            [
                {
                    text: t("common.actions.cancel"),
                    style: "cancel",
                },
                {
                    text: "Se déconnecter",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();

                        if (error) {
                            Alert.alert(t("common.alerts.errorTitle"), error.message || t("common.alerts.genericError"));
                            return;
                        }

                        router.replace("/onboarding/start");
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <SymbolView name="rectangle.portrait.and.arrow.right" weight="medium" size={20} tintColor="#151515" />
            </TouchableOpacity>

            {!isRequiredPaywall ? (
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <SymbolView name="chevron.left" weight="medium" size={20} tintColor="#151515" />
                </TouchableOpacity>
            ) : null}

            <ScrollView
                bounces={false}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
            >
                <View style={styles.content}>
                    <Animated.View
                        entering={FadeInUp.delay(80).duration(420).easing(Easing.out(Easing.cubic))}
                        style={styles.characterBlock}
                    >
                        <Image
                            contentFit="contain"
                            source={require("@/assets/images/character/1.png")}
                            style={styles.character}
                        />
                        <Image
                            contentFit="contain"
                            source={require("@/assets/images/character/0.png")}
                            style={styles.characterShadow}
                        />
                    </Animated.View>

                    <Animated.Text
                        entering={FadeInUp.delay(150).duration(430).easing(Easing.out(Easing.cubic))}
                        style={styles.title}
                    >
                        <Text style={styles.titleMuted}>Reprends</Text>
                        <Text style={styles.titleStrong}> le contrôle</Text>
                    </Animated.Text>

                    <Animated.View
                        entering={FadeInUp.delay(230).duration(430).easing(Easing.out(Easing.cubic))}
                        style={styles.phoneStage}
                    >
                        <Image
                            contentFit="contain"
                            source={require("@/assets/images/paywall/phone.png")}
                            style={styles.phoneImage}
                        />
                    </Animated.View>

                    <Animated.View
                        entering={FadeInUp.delay(310).duration(430).easing(Easing.out(Easing.cubic))}
                        style={styles.coffeePill}
                    >
                        <Text style={styles.coffeeText}>Pour l’équivalent d’un café par mois</Text>
                        <Image
                            contentFit="contain"
                            source={require("@/assets/images/paywall/coffee.png")}
                            style={styles.coffeeImage}
                        />
                    </Animated.View>

                    <Animated.View
                        entering={FadeInUp.delay(390).duration(430).easing(Easing.out(Easing.cubic))}
                        style={styles.plans}
                    >
                        <SubscriptionPlanOption
                            disabled={!packages.monthly}
                            label="Mensuel"
                            onPress={() => setSelectedPlan("monthly")}
                            price={isLoading ? "..." : packages.monthly?.product.priceString ?? "..."}
                            selected={selectedPlan === "monthly"}
                        />
                        <SubscriptionPlanOption
                            disabled={!packages.annual}
                            discount="-40%"
                            label="Annuel"
                            onPress={() => setSelectedPlan("annual")}
                            price={isLoading ? "..." : packages.annual?.product.priceString ?? "..."}
                            selected={selectedPlan === "annual"}
                        />
                    </Animated.View>

                    <Animated.Text
                        entering={FadeInUp.delay(470).duration(430).easing(Easing.out(Easing.cubic))}
                        style={styles.trialText}
                    >
                        {trialText}
                    </Animated.Text>

                    {shouldShowOfferStatus ? (
                        <Animated.View
                            entering={FadeInUp.delay(500).duration(430).easing(Easing.out(Easing.cubic))}
                            style={styles.offerStatus}
                        >
                            <Text style={styles.offerStatusText}>
                                {isLoading ? t("common.status.loading") : t("settings.premium.offersNotLoaded")}
                            </Text>
                            {!isLoading ? (
                                <TouchableOpacity onPress={() => void loadOfferings()} style={styles.retryButton}>
                                    <Text style={styles.retryText}>{t("common.actions.retry")}</Text>
                                </TouchableOpacity>
                            ) : null}
                        </Animated.View>
                    ) : null}

                    <Animated.View
                        entering={FadeInUp.delay(540).duration(430).easing(Easing.out(Easing.cubic))}
                        style={styles.buttonSlot}
                    >
                        {isPurchasing ? (
                            <View style={styles.loadingButton}>
                                <ActivityIndicator color="#FFFFFF" />
                            </View>
                        ) : (
                            <OnboardingButton
                                disabled={isLoading || !selectedPackage}
                                onPress={buyPremium}
                                title="Se lancer"
                            />
                        )}
                    </Animated.View>
                </View>

                {/* <Animated.View
                    entering={FadeInUp.delay(610).duration(430).easing(Easing.out(Easing.cubic))}
                    style={styles.restoreSlot}
                >
                    <TouchableOpacity
                        disabled={isRestoring}
                        onPress={restorePremium}
                        style={styles.restoreButton}
                    >
                        {isRestoring ? (
                            <ActivityIndicator size="small" color="#535353" />
                        ) : (
                            <Text style={styles.restoreButtonText}>
                                {t("settings.premium.restorePurchases")}
                            </Text>
                        )}
                    </TouchableOpacity>
                </Animated.View> */}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: "#EFEFEF",
        flex: 1,
    },
    backButton: {
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        height: 44,
        justifyContent: "center",
        position: "absolute",
        right: 18,
        top: 18,
        width: 44,
        zIndex: 10,
    },
    logoutButton: {
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        height: 44,
        justifyContent: "center",
        left: 18,
        position: "absolute",
        top: 68,
        width: 44,
        zIndex: 10,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        alignItems: "center",
        flexGrow: 1,
        justifyContent: "center",
        paddingBottom: 28,
        paddingHorizontal: 24,
        paddingTop: 72,
    },
    content: {
        alignItems: "center",
        maxWidth: 430,
        width: "100%",
    },
    characterBlock: {
        alignItems: "center",
        height: 96,
        justifyContent: "flex-end",
        width: "100%",
    },
    character: {
        height: 92,
        width: 92,
        zIndex: 2,
    },
    characterShadow: {
        height: 22,
        marginTop: -4,
        opacity: 0.32,
        width: 92,
    },
    title: {
        fontFamily: "Inter_24pt-SemiBold",
        fontSize: 30,
        letterSpacing: 0,
        lineHeight: 35,
        marginTop: 14,
        textAlign: "center",
    },
    titleMuted: {
        color: "#818181",
    },
    titleStrong: {
        color: "#050505",
    },
    phoneStage: {
        alignItems: "center",
        height: 214,
        justifyContent: "flex-end",
        marginTop: 14,
        width: "100%",
    },
    phoneImage: {
        height: 214,
        width: 208,
    },
    coffeePill: {
        alignItems: "center",
        alignSelf: "stretch",
        backgroundColor: "#FFFFFF",
        borderRadius: 999,
        flexDirection: "row",
        gap: 10,
        justifyContent: "space-between",
        marginTop: 8,
        minHeight: 46,
        paddingLeft: 18,
        paddingRight: 14,
    },
    coffeeText: {
        color: "#4C4C4C",
        flex: 1,
        fontFamily: "Satoshi-Regular",
        fontSize: 14,
        lineHeight: 22,
    },
    coffeeImage: {
        height: 35,
        transform: [{ rotate: "18deg" }],
        width: 35,
    },
    plans: {
        alignSelf: "stretch",
        gap: 7,
        marginTop: 16,
    },
    trialText: {
        color: "#535353",
        fontFamily: "Satoshi-Regular",
        fontSize: 17,
        lineHeight: 22,
        marginTop: 16,
        textAlign: "center",
    },
    offerStatus: {
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        minHeight: 42,
    },
    offerStatusText: {
        color: "#6A6A6A",
        fontFamily: "Satoshi-Regular",
        fontSize: 13,
        lineHeight: 17,
        textAlign: "center",
    },
    retryButton: {
        minHeight: 22,
        justifyContent: "center",
    },
    retryText: {
        color: "#151515",
        fontFamily: "Satoshi-Bold",
        fontSize: 13,
        textAlign: "center",
        textDecorationLine: "underline",
    },
    buttonSlot: {
        marginTop: 10,
        width: "76%",
    },
    loadingButton: {
        alignItems: "center",
        backgroundColor: "#050505",
        borderRadius: 12,
        justifyContent: "center",
        minHeight: 46,
        width: "100%",
    },
    restoreSlot: {
        marginTop: 8,
        minHeight: 28,
    },
    restoreButton: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 28,
    },
    restoreButtonText: {
        color: "#535353",
        fontFamily: "Satoshi-Regular",
        fontSize: 13,
        textDecorationLine: "underline",
    },
});
