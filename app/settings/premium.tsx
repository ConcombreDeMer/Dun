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
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, {
    Easing,
    FadeInUp,
} from "react-native-reanimated";

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
        if (!selectedPlan) {
            Alert.alert(t("common.alerts.errorTitle"), "Choisis une option avant de te lancer.");
            return;
        }

        if (!selectedPackage) {
            Alert.alert(t("common.alerts.errorTitle"), t("settings.premium.offersNotLoaded"));
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
        <View style={styles.safeArea}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <SymbolView name="rectangle.portrait.and.arrow.right" weight="medium" size={20} tintColor="#151515" />
            </TouchableOpacity>

            {!isRequiredPaywall ? (
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <SymbolView name="chevron.left" weight="medium" size={20} tintColor="#151515" />
                </TouchableOpacity>
            ) : null}

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
                        label="Mensuel"
                        onPress={() => setSelectedPlan("monthly")}
                        price={isLoading ? "..." : packages.monthly?.product.priceString || "1,99€"}
                        selected={selectedPlan === "monthly"}
                    />
                    <SubscriptionPlanOption
                        discount="-40%"
                        label="Annuel"
                        onPress={() => setSelectedPlan("annual")}
                        price={isLoading ? "..." : packages.annual?.product.priceString || "14,99€"}
                        selected={selectedPlan === "annual"}
                    />
                </Animated.View>

                <Animated.Text
                    entering={FadeInUp.delay(470).duration(430).easing(Easing.out(Easing.cubic))}
                    style={styles.trialText}
                >
                    {trialText}
                </Animated.Text>

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
                            disabled={isLoading}
                            onPress={buyPremium}
                            title="Se lancer"
                        />
                    )}
                </Animated.View>

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
            </View>
        </View>
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
        top: 58,
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
        top: 58,
        width: 44,
        zIndex: 10,
    },
    content: {
        alignItems: "center",
        flex: 1,
        paddingHorizontal: 30,
        paddingTop: 110,
    },
    characterBlock: {
        alignItems: "center",
        height: 120,
        justifyContent: "flex-end",
        width: "100%",
    },
    character: {
        height: 112,
        width: 112,
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
        marginTop: 18,
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
        height: 250,
        justifyContent: "flex-end",
        marginTop: 14,
        width: "100%",
    },
    phoneImage: {
        height: 250,
        width: 243,
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
        marginTop: 20,
        textAlign: "center",
    },
    buttonSlot: {
        marginTop: 10,
        width: "80%",
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
