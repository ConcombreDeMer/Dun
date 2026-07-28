import ObjectiveCard from "@/components/onboarding/ObjectiveCard";
import OnboardingButton from "@/components/onboarding/OnboardingButton";
import OnboardingInfoBubble from "@/components/onboarding/OnboardingInfoBubble";
import OnboardingLogoutMenu from "@/components/onboarding/OnboardingLogoutMenu";
import OnboardingNameSheet from "@/components/onboarding/OnboardingNameSheet";
import OnboardingOptionList from "@/components/onboarding/OnboardingOptionList";
import OnboardingSlider from "@/components/onboarding/OnboardingSlider";
import {
  createOnboardingSteps,
  createSliderOptions,
  type CharacterPlacement,
  type CharacterPosition,
  type OnboardingStep,
  type OnboardingTextPart,
} from "@/components/onboarding/onboardingSteps";
import Squircle from "@/components/Squircle";
import SubscriptionPlanOption from "@/components/SubscriptionPlanOption";
import { clearStoredExportData } from "@/lib/exportData";
import { getCharacterImageSource } from "@/lib/imageHelper";
import { patchProfileCache } from "@/lib/profile";
import { TrialEligibilityStatus, useSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/store";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  createAnimatedComponent,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTranslation } from "../../lib/i18n";

const REFERENCE_WIDTH = 320;
const REFERENCE_HEIGHT = 700;
const LIGHT_THEME = "light" as const;
// Ajuste cette valeur pour monter/descendre le contenu des écrans 15 à 17.
const OBJECTIVE_SCREENS_CONTENT_TOP = 190;
const OBJECTIVE_CARD_HEIGHT = 164;
const AnimatedImage = createAnimatedComponent(Image);
type PremiumPlan = "annual" | "monthly";
const CHARACTER_PLACEMENTS: Record<CharacterPosition, CharacterPlacement> = {
  centered: { top: 184, left: 90, size: 140 },
  medium: { top: 122, left: 92, size: 136 },
  high: { top: 70, left: 104, size: 112 },
};

export default function Tutorial() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearStore = useStore((state) => state.clearStore);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [name, setName] = useState("");
  const [isNameSheetVisible, setIsNameSheetVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [infoRevealCount, setInfoRevealCount] = useState(1);
  const [isCompletingPurchase, setIsCompletingPurchase] = useState(false);
  const [selectedPremiumPlan, setSelectedPremiumPlan] = useState<PremiumPlan | null>(null);
  const [sliderIndex, setSliderIndex] = useState(3);
  const [trialEligibility, setTrialEligibility] = useState<TrialEligibilityStatus>("unknown");
  const {
    checkTrialEligibility,
    isLoading: isSubscriptionLoading,
    isPurchasing,
    loadOfferings,
    packages,
    purchasePackage,
  } = useSubscription();
  const onboardingSteps = useMemo(() => createOnboardingSteps((key) => t(key)), [t]);
  const sliderOptions = useMemo(() => createSliderOptions((key) => t(key)), [t]);
  const sliderLabels = useMemo(() => sliderOptions.map((option) => option.label), [sliderOptions]);
  const recurrenceOptions = useMemo(
    () => onboardingSteps.find((onboardingStep) => onboardingStep.id === "recurrence")?.options ?? [],
    [onboardingSteps]
  );
  const contentProgress = useSharedValue(1);
  const initialPlacement = CHARACTER_PLACEMENTS[onboardingSteps[0].characterPosition];
  const characterTop = useSharedValue(initialPlacement.top);
  const characterLeft = useSharedValue(initialPlacement.left);
  const characterSize = useSharedValue(initialPlacement.size);
  const characterOpacity = useSharedValue(onboardingSteps[0].hideCharacter ? 0 : 1);
  const characterLift = useSharedValue(onboardingSteps[0].hideCharacter ? -18 : 0);
  const objectiveCardTop = useSharedValue(getObjectiveFloatingCardTop(onboardingSteps[0].id, height));
  const objectiveCardOpacity = useSharedValue(0);
  const objectiveCardTranslateY = useSharedValue(0);
  const wasShowingFloatingObjectiveCard = useRef(false);

  const step = onboardingSteps[currentIndex];
  const frameWidth = Math.min(width, 430);
  const widthScale = frameWidth / REFERENCE_WIDTH;
  const heightScale = Math.min(height / REFERENCE_HEIGHT, 1.18);
  const selectedRhythmOption = sliderOptions[sliderIndex] ?? sliderOptions[3];
  const selectedRhythm = selectedRhythmOption.label;
  const selectedRhythmDays = selectedRhythmOption.days;
  const isLastStep = currentIndex === onboardingSteps.length - 1;
  const isScrollableStep = step.type === "longTerm" || step.type === "trial";
  const showStageCharacter = !isScrollableStep || step.type === "longTerm" || step.type === "trial";
  const contentPositionStyle = getContentPositionStyle(step.id);
  const shouldShowFloatingObjectiveCard = isFloatingObjectiveCardStep(step.id);
  const selectedPackage = selectedPremiumPlan === "annual"
    ? packages.annual
    : selectedPremiumPlan === "monthly"
    ? packages.monthly
    : undefined;
  const trialButtonDisabled = isTransitioning || isPurchasing || isCompletingPurchase || (step.type === "trial" && (isSubscriptionLoading || !selectedPackage));
  const trialEligibilityProductIdentifier =
    selectedPackage?.product.identifier ??
    packages.annual?.product.identifier ??
    packages.monthly?.product.identifier;

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  useEffect(() => {
    if (selectedPremiumPlan === "monthly" && packages.monthly) {
      return;
    }

    if (selectedPremiumPlan === "annual" && packages.annual) {
      return;
    }

    if (packages.monthly) {
      setSelectedPremiumPlan("monthly");
      return;
    }

    if (packages.annual) {
      setSelectedPremiumPlan("annual");
      return;
    }

    setSelectedPremiumPlan(null);
  }, [packages.annual, packages.monthly, selectedPremiumPlan]);

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

  useEffect(() => {
    const placement = CHARACTER_PLACEMENTS[step.characterPosition];

    characterTop.value = withTiming(placement.top, {
      duration: 560,
      easing: Easing.inOut(Easing.cubic),
    });
    characterLeft.value = withTiming(placement.left, {
      duration: 560,
      easing: Easing.inOut(Easing.cubic),
    });
    characterSize.value = withTiming(placement.size, {
      duration: 560,
      easing: Easing.inOut(Easing.cubic),
    });
    characterOpacity.value = withTiming(step.hideCharacter ? 0 : 1, {
      duration: step.hideCharacter ? 260 : 360,
      easing: Easing.out(Easing.cubic),
    });
    characterLift.value = withTiming(step.hideCharacter ? -22 : 0, {
      duration: step.hideCharacter ? 260 : 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [characterLeft, characterLift, characterOpacity, characterSize, characterTop, step.characterPosition, step.hideCharacter]);

  useEffect(() => {
    const nextTop = getObjectiveFloatingCardTop(step.id, height);
    const wasVisible = wasShowingFloatingObjectiveCard.current;

    if (shouldShowFloatingObjectiveCard && !wasVisible) {
      objectiveCardTop.value = nextTop;
      objectiveCardOpacity.value = 0;
      objectiveCardTranslateY.value = 18;
      objectiveCardOpacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      objectiveCardTranslateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else if (shouldShowFloatingObjectiveCard) {
      objectiveCardTop.value = withTiming(nextTop, {
        duration: 560,
        easing: Easing.inOut(Easing.cubic),
      });
      objectiveCardOpacity.value = 1;
      objectiveCardTranslateY.value = 0;
    } else if (wasVisible) {
      objectiveCardOpacity.value = withTiming(0, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
      });
      objectiveCardTranslateY.value = withTiming(-8, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
      });
    }

    wasShowingFloatingObjectiveCard.current = shouldShowFloatingObjectiveCard;
  }, [height, objectiveCardOpacity, objectiveCardTop, objectiveCardTranslateY, shouldShowFloatingObjectiveCard, step.id]);

  const characterStyle = useAnimatedStyle(() => ({
    height: characterSize.value * widthScale,
    left: characterLeft.value * widthScale,
    opacity: characterOpacity.value,
    top: characterTop.value * heightScale,
    transform: [{ translateY: characterLift.value }],
    width: characterSize.value * widthScale,
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    height: characterSize.value * 0.22 * widthScale,
    left: (characterLeft.value + characterSize.value * 0.18) * widthScale,
    opacity: characterOpacity.value * 0.36,
    top: (characterTop.value * heightScale) + characterSize.value * 0.95 * widthScale,
    width: characterSize.value * 0.66 * widthScale,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
    transform: [
      {
        translateY: step.type === "info"
          ? -18 + contentProgress.value * 18
          : 18 - contentProgress.value * 18,
      },
    ],
  }));

  const objectiveFloatingCardStyle = useAnimatedStyle(() => ({
    opacity: objectiveCardOpacity.value,
    top: objectiveCardTop.value,
    transform: [{ translateY: objectiveCardTranslateY.value }],
  }));

  const goToIndex = (nextIndex: number) => {
    if (isTransitioning || nextIndex < 0 || nextIndex >= onboardingSteps.length) {
      return;
    }

    Keyboard.dismiss();
    setIsTransitioning(true);
    const currentStep = onboardingSteps[currentIndex];
    const nextStep = onboardingSteps[nextIndex];
    const characterWillMove = currentStep.characterPosition !== nextStep.characterPosition;
    const contentEnterDelay = characterWillMove ? 420 : 0;
    const transitionLockDuration = contentEnterDelay + 430;

    contentProgress.value = withTiming(0, {
      duration: 170,
      easing: Easing.in(Easing.cubic),
    });

    setTimeout(() => {
      if (nextStep.id === "lost-time") {
        setInfoRevealCount(1);
      }
      setCurrentIndex(nextIndex);
      setTimeout(() => {
        contentProgress.value = withTiming(1, {
          duration: 420,
          easing: Easing.out(Easing.cubic),
        });
      }, contentEnterDelay);
      setTimeout(() => setIsTransitioning(false), transitionLockDuration);
    }, 180);
  };

  const saveOnboardingProfile = async () => {
    try {
      const trimmedName = name.trim();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from("Profiles")
          .update({ hasName: true, name: trimmedName })
          .eq("id", user.id);

        if (error) {
          console.error("Erreur lors de la sauvegarde du name dans Supabase:", error);
        } else {
          patchProfileCache(queryClient, user.id, { hasName: true, name: trimmedName });
        }
      }

      if (trimmedName) {
        const { error } = await supabase.auth.updateUser({ data: { name: trimmedName } });

        if (error) {
          console.error("Erreur lors de la mise à jour du nom d'utilisateur : " + error.message);
          return false;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du name:", error);
      return false;
    }

    return true;
  };

  const finishOnboarding = async () => {
    const didSaveProfile = await saveOnboardingProfile();

    if (!didSaveProfile) {
      return;
    }

    router.replace("/settings/premium?required=1");
  };

  const startTrialFromOnboarding = async () => {
    if (isCompletingPurchase) {
      return;
    }

    if (!selectedPackage) {
      void loadOfferings();
      return;
    }

    setIsCompletingPurchase(true);

    try {
      const didSaveProfile = await saveOnboardingProfile();

      if (!didSaveProfile) {
        return;
      }

      const hasPremium = await purchasePackage(selectedPackage);

      if (hasPremium) {
        router.replace("/");
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert(t("settings.premium.purchaseErrorTitle"), e.message || t("common.alerts.genericError"));
      }
    } finally {
      setIsCompletingPurchase(false);
    }
  };

  const handleNext = () => {
    if (step.type === "name" && name.trim() === "") {
      Alert.alert(t("onboarding.tutorial.alertTitle"), t("onboarding.tutorial.missingName1"));
      setIsNameSheetVisible(true);
      return;
    }

    if ((step.type === "options" || step.type === "objectiveQuestion") && !answers[step.id]?.length) {
      Alert.alert(
        t("onboarding.tutorial.requiredAnswerTitle"),
        t("onboarding.tutorial.requiredAnswerMessage")
      );
      return;
    }

    if (step.type === "info" && infoRevealCount < 3) {
      setInfoRevealCount((count) => count + 1);
      return;
    }

    if (step.type === "trial") {
      void startTrialFromOnboarding();
      return;
    }

    if (isLastStep) {
      void finishOnboarding();
      return;
    }

    goToIndex(currentIndex + 1);
  };

  const handleBack = () => {
    goToIndex(currentIndex - 1);
  };

  const logout = useCallback(async () => {
    try {
      try {
        await clearStoredExportData();
      } catch (exportError) {
        console.error("Erreur lors du nettoyage de l'export local : ", exportError);
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert(t("common.alerts.errorTitle"), error.message || t("common.alerts.genericError"));
        return;
      }

      queryClient.clear();
      clearStore();
      router.replace("/onboarding/start");
    } catch (error) {
      console.error("Erreur lors de la déconnexion : ", error);
      Alert.alert(t("common.alerts.errorTitle"), t("common.alerts.genericError"));
    }
  }, [clearStore, queryClient, router, t]);

  const confirmLogout = useCallback(() => {
    Alert.alert(
      t("common.actions.logout"),
      t("onboarding.tutorial.logoutConfirmMessage"),
      [
        {
          text: t("common.actions.cancel"),
          style: "cancel",
        },
        {
          text: t("common.actions.logout"),
          style: "destructive",
          onPress: () => {
            void logout();
          },
        },
      ]
    );
  }, [logout, t]);

  const buttonTitle = useMemo(() => {
    if (step.type === "trial" && (isPurchasing || isCompletingPurchase)) {
      return t("common.status.loading");
    }

    if (step.buttonTitle) return step.buttonTitle;
    return t("common.actions.next");
  }, [isCompletingPurchase, isPurchasing, step, t]);

  const isAcceptButton = step.id === "objective";

  return (
    <View style={styles.root}>
      <View style={[styles.stage, { width: frameWidth }]}>
        {currentIndex > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleBack}
            style={[styles.backButton, { top: insets.top + 12 }]}
          >
            <SymbolView name="chevron.left" size={22} tintColor="#151515" weight="bold" />
          </Pressable>
        ) : null}

        <View style={[styles.logoutMenu, { top: insets.top + 12 }]}>
          <OnboardingLogoutMenu
            label={t("common.actions.logout")}
            onLogoutPress={confirmLogout}
          />
        </View>

        {showStageCharacter && step.character !== "9" && !step.hideCharacter ? (
          <AnimatedImage
            contentFit="contain"
            source={getCharacterImageSource("0", LIGHT_THEME)}
            style={[styles.characterShadow, shadowStyle]}
          />
        ) : null}
        {showStageCharacter ? (
          <AnimatedImage
            contentFit="contain"
            source={getCharacterImageSource(step.character, LIGHT_THEME)}
            style={[styles.character, characterStyle]}
            transition={140}
          />
        ) : null}

        {shouldShowFloatingObjectiveCard ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.objectiveFloatingCard, objectiveFloatingCardStyle]}
          >
            <ObjectiveCard
              dayCount={selectedRhythmDays}
              dayUnitLabel={t("onboarding.tutorial.dayUnitShort")}
              duration={selectedRhythm}
              title={t("onboarding.tutorial.objectiveCard.title")}
            />
          </Animated.View>
        ) : null}

        {isScrollableStep ? (
          <Animated.View
            pointerEvents={isTransitioning ? "none" : "auto"}
            style={[styles.scrollableStep, contentStyle]}
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={[
                styles.stepScrollContent,
                step.type === "longTerm" ? styles.longTermScrollContent : styles.trialScrollContent,
                { paddingBottom: insets.bottom + 34 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {renderStepContent({
                answers,
                isNameSheetVisible,
                infoRevealCount,
                name,
                recurrenceOptions,
                selectedRhythm,
                setAnswers,
                setIsNameSheetVisible,
                setSliderIndex,
                isSubscriptionLoading,
                onRetryLoadOfferings: loadOfferings,
                onSelectPremiumPlan: setSelectedPremiumPlan,
                packages,
                selectedPremiumPlan,
                sliderIndex,
                sliderLabels,
                step,
                t: (key) => t(key),
                trialEligibility,
              })}
              <View style={styles.inlineButton}>
                <OnboardingButton
                  disabled={trialButtonDisabled}
                  onPress={handleNext}
                  title={buttonTitle}
                  variant={isAcceptButton ? "success" : "primary"}
                />
              </View>
            </ScrollView>
          </Animated.View>
        ) : (
          <>
            <Animated.View
              pointerEvents={isTransitioning ? "none" : "auto"}
              style={[styles.content, contentPositionStyle, contentStyle]}
            >
              {renderStepContent({
                answers,
                isNameSheetVisible,
                infoRevealCount,
                name,
                recurrenceOptions,
                selectedRhythm,
                setAnswers,
                setIsNameSheetVisible,
                setSliderIndex,
                isSubscriptionLoading,
                onRetryLoadOfferings: loadOfferings,
                onSelectPremiumPlan: setSelectedPremiumPlan,
                packages,
                selectedPremiumPlan,
                sliderIndex,
                sliderLabels,
                step,
                t: (key) => t(key),
                trialEligibility,
              })}
            </Animated.View>

            <View style={[styles.bottom, { bottom: insets.bottom + 28 }]}>
              <OnboardingButton
                disabled={trialButtonDisabled}
                onPress={handleNext}
                title={buttonTitle}
                variant={isAcceptButton ? "success" : "primary"}
              />
            </View>
          </>
        )}
        {isNameSheetVisible ? (
          <OnboardingNameSheet
            isVisible={isNameSheetVisible}
            name={name}
            onChangeName={setName}
            onClose={() => setIsNameSheetVisible(false)}
            placeholder={t("onboarding.tutorial.namePlaceholder")}
            onSubmit={() => setIsNameSheetVisible(false)}
          />
        ) : null}
      </View>
    </View>
  );
}

function getContentPositionStyle(stepId: string) {
  if (stepId === "determination" || stepId === "transform" || stepId === "long-term") {
    return styles.contentHighLower;
  }

  if (stepId === "rhythm" || stepId === "noted") {
    return styles.contentRaised;
  }

  if (stepId === "trial") {
    return styles.trialContent;
  }

  if (stepId === "lost-time") {
    return styles.contentMiddle;
  }

  return styles.contentLow;
}

function isFloatingObjectiveCardStep(stepId: string) {
  return stepId === "objective" || stepId === "determination" || stepId === "transform";
}

function getObjectiveFloatingCardTop(stepId: string, screenHeight: number) {
  if (stepId === "objective") {
    return Math.max(310, screenHeight - 331);
  }

  if (stepId === "determination" || stepId === "transform") {
    return OBJECTIVE_SCREENS_CONTENT_TOP;
  }

  return OBJECTIVE_SCREENS_CONTENT_TOP;
}

type RenderStepContentArgs = {
  answers: Record<string, string[]>;
  isNameSheetVisible: boolean;
  infoRevealCount: number;
  name: string;
  recurrenceOptions: string[];
  selectedRhythm: string;
  setAnswers: (answers: Record<string, string[]>) => void;
  setIsNameSheetVisible: (isVisible: boolean) => void;
  setSliderIndex: (index: number) => void;
  isSubscriptionLoading: boolean;
  onRetryLoadOfferings: () => Promise<void>;
  onSelectPremiumPlan: (plan: PremiumPlan) => void;
  packages: ReturnType<typeof useSubscription>["packages"];
  selectedPremiumPlan: PremiumPlan | null;
  sliderIndex: number;
  sliderLabels: string[];
  step: OnboardingStep;
  t: (key: string) => string;
  trialEligibility: TrialEligibilityStatus;
};

function renderStepContent({
  answers,
  isNameSheetVisible,
  infoRevealCount,
  name,
  recurrenceOptions,
  selectedRhythm,
  setAnswers,
  setIsNameSheetVisible,
  setSliderIndex,
  isSubscriptionLoading,
  onRetryLoadOfferings,
  onSelectPremiumPlan,
  packages,
  selectedPremiumPlan,
  sliderIndex,
  sliderLabels,
  step,
  t,
  trialEligibility,
}: RenderStepContentArgs) {
  if (step.type === "info") {
    const recurrenceStats = getRecurrenceStats(answers.recurrence?.[0], recurrenceOptions);
    const copyBaseKey = recurrenceStats.isDaily
      ? "onboarding.tutorial.info.daily"
      : recurrenceStats.isEncouraging
      ? "onboarding.tutorial.info.encouraging"
      : "onboarding.tutorial.info.impact";

    const infoBubbles = [
      richInline([
        { text: formatTranslation(t(`${copyBaseKey}.monthPrefix`), recurrenceStats) },
        { text: formatTranslation(t(`${copyBaseKey}.monthStrong`), recurrenceStats), strong: true },
        { text: formatTranslation(t(`${copyBaseKey}.monthSuffix`), recurrenceStats) },
      ]),
      richInline([
        { text: formatTranslation(t(`${copyBaseKey}.yearPrefix`), recurrenceStats) },
        { text: formatTranslation(t(`${copyBaseKey}.yearStrong`), recurrenceStats), strong: true },
        { text: formatTranslation(t(`${copyBaseKey}.yearSuffix`), recurrenceStats) },
      ]),
      richInline([
        { text: formatTranslation(t(`${copyBaseKey}.decadePrefix`), recurrenceStats) },
        { text: formatTranslation(t(`${copyBaseKey}.decadeStrong`), recurrenceStats), strong: true },
        { text: formatTranslation(t(`${copyBaseKey}.decadeSuffix`), recurrenceStats) },
      ]),
    ];

    return (
      <View style={styles.infoStack}>
        {infoBubbles.map((body, index) => (
          <View key={`${copyBaseKey}-${index}`} style={styles.infoBubbleSlot}>
            <InfoBubbleReveal isVisible={index < infoRevealCount}>
              <OnboardingInfoBubble size="large" body={body} />
            </InfoBubbleReveal>
          </View>
        ))}
      </View>
    );
  }

  if (step.type === "options" || step.type === "objectiveQuestion") {
    if (step.type === "objectiveQuestion") {
      return (
        <View style={styles.determinationStack}>
          {renderTitle(step, name, selectedRhythm, t)}
          <OnboardingOptionList
            mode={step.selectionMode ?? "multiple"}
            onChange={(options) => setAnswers({ ...answers, [step.id]: options })}
            options={step.options ?? []}
            selected={answers[step.id] ?? []}
          />
        </View>
      );
    }

    return (
      <View style={styles.questionStack}>
        {renderTitle(step, name, selectedRhythm, t)}
        <OnboardingOptionList
          mode={step.selectionMode ?? "multiple"}
          onChange={(options) => setAnswers({ ...answers, [step.id]: options })}
          options={step.options ?? []}
          selected={answers[step.id] ?? []}
        />
      </View>
    );
  }

  if (step.type === "name") {
    return (
      <View style={styles.nameStack}>
        {renderTitle(step, name, selectedRhythm, t)}
        <Pressable
          accessibilityRole="button"
          disabled={isNameSheetVisible}
          onPress={() => setIsNameSheetVisible(true)}
        >
          <SquircleNameInputPreview
            isVisible={!isNameSheetVisible}
            name={name}
            placeholder={t("onboarding.tutorial.namePlaceholder")}
          />
        </Pressable>
      </View>
    );
  }

  if (step.type === "slider") {
    return (
      <View style={styles.sliderStack}>
        {renderTitle(step, name, selectedRhythm, t)}
        <OnboardingSlider
          onChange={setSliderIndex}
          options={sliderLabels}
          selectedIndex={sliderIndex}
        />
      </View>
    );
  }

  if (step.type === "objective") {
    return (
      <View style={styles.objectiveStack}>
        {step.id === "transform" ? (
          <>
            <View style={[styles.objectiveCardPlaceholder, styles.topObjectiveCard]} />
            {renderTitle(step, name, selectedRhythm, t)}
          </>
        ) : (
          <>
            {renderTitle(step, name, selectedRhythm, t)}
            <View style={[styles.objectiveCardPlaceholder, styles.objectiveCard]} />
          </>
        )}
      </View>
    );
  }

  if (step.type === "longTerm") {
    return (
      <View style={styles.longTermStack}>
        <ObjectiveCard
          duration={t("onboarding.tutorial.longTermCard.duration")}
          dayUnitLabel={t("onboarding.tutorial.dayUnitShort")}
          longTermLabels={{
            firstGoal: t("onboarding.tutorial.longTermAchievement.firstGoal"),
            flow: t("onboarding.tutorial.longTermAchievement.flow"),
            mastery: t("onboarding.tutorial.longTermAchievement.mastery"),
          }}
          style={styles.longTermCard}
          title={t("onboarding.tutorial.longTermCard.title")}
          variant="longTerm"
        />
        <View style={styles.longTermFeatureStack}>
          <OnboardingInfoBubble
            body={t("onboarding.tutorial.longTermFeatures.mastery.body")}
            size="feature"
            symbolName="figure.mind.and.body"
            title={t("onboarding.tutorial.longTermFeatures.mastery.title")}
          />
          <OnboardingInfoBubble
            body={t("onboarding.tutorial.longTermFeatures.screenTime.body")}
            size="feature"
            symbolName="iphone.slash"
            title={t("onboarding.tutorial.longTermFeatures.screenTime.title")}
          />
        </View>
      </View>
    );
  }

  if (step.type === "trial") {
    const trialText = trialEligibility === "ineligible"
      ? "Période d’essai expirée"
      : "Débloquer la période d’essai 14j";
    const hasAvailablePackages = Boolean(packages.monthly || packages.annual);
    const shouldShowOfferStatus = isSubscriptionLoading || !hasAvailablePackages || !selectedPremiumPlan;

    return (
      <View style={styles.trialStack}>
        <Text style={[styles.title, styles.largeTitle, styles.trialTitle]}>
          <Text style={styles.mutedText}>Reprends</Text>
          <Text style={styles.strongText}> le contrôle</Text>
        </Text>

        <Image
          contentFit="contain"
          source={require("@/assets/images/paywall/phone.png")}
          style={styles.trialPhone}
        />

        <View style={styles.trialOfferBlock}>
          <View style={styles.trialCoffeePill}>
            <Text style={styles.trialCoffeeText}>Pour l’équivalent d’un café par mois</Text>
            <Image
              contentFit="contain"
              source={require("@/assets/images/paywall/coffee.png")}
              style={styles.trialCoffeeImage}
            />
          </View>

          <View style={styles.trialPlans}>
            <SubscriptionPlanOption
              disabled={!packages.monthly}
              label="Mensuel"
              onPress={() => onSelectPremiumPlan("monthly")}
              price={isSubscriptionLoading ? "..." : packages.monthly?.product.priceString ?? "..."}
              selected={selectedPremiumPlan === "monthly"}
            />
            <SubscriptionPlanOption
              disabled={!packages.annual}
              discount="-40%"
              label="Annuel"
              onPress={() => onSelectPremiumPlan("annual")}
              price={isSubscriptionLoading ? "..." : packages.annual?.product.priceString ?? "..."}
              selected={selectedPremiumPlan === "annual"}
            />
          </View>

          <Text style={styles.trialCaption}>{trialText}</Text>
          {shouldShowOfferStatus ? (
            <View style={styles.trialOfferStatus}>
              <Text style={styles.trialOfferStatusText}>
                {isSubscriptionLoading ? t("common.status.loading") : t("settings.premium.offersNotLoaded")}
              </Text>
              {!isSubscriptionLoading ? (
                <Pressable onPress={() => void onRetryLoadOfferings()} style={styles.trialRetryButton}>
                  <Text style={styles.trialRetryText}>{t("common.actions.retry")}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.textStack}>
      {renderTitle(step, name, selectedRhythm, t)}
    </View>
  );
}

function getRecurrenceStats(answer: string | undefined, recurrenceOptions: string[]) {
  const unsatisfiedRatiosByIndex = [1, 0.9, 0.75, 0.5, 0.38];
  const selectedIndex = recurrenceOptions.indexOf(answer ?? "");
  const ratio = unsatisfiedRatiosByIndex[selectedIndex] ?? unsatisfiedRatiosByIndex[0];
  const monthDays = Math.round(30 * ratio);
  const yearDays = Math.round(365 * ratio);
  const yearHours = yearDays * 24;
  const yearMonths = Math.round(yearDays / 30);
  const decadeYears = Math.round(10 * ratio);
  const decadeHours = yearDays * 10;

  return {
    decadeHours,
    decadeYears,
    isDaily: selectedIndex <= 0,
    isEncouraging: selectedIndex === 4,
    monthDays,
    yearDays,
    yearHours,
    yearMonths,
  };
}

function formatTranslation(
  template: string,
  values: ReturnType<typeof getRecurrenceStats>
) {
  return template
    .replace("{{monthDays}}", String(values.monthDays))
    .replace("{{yearDays}}", String(values.yearDays))
    .replace("{{yearHours}}", String(values.yearHours))
    .replace("{{yearMonths}}", String(values.yearMonths))
    .replace("{{decadeHours}}", String(values.decadeHours))
    .replace("{{decadeYears}}", String(values.decadeYears));
}

function renderTitle(
  step: OnboardingStep,
  name: string,
  selectedRhythm: string,
  t: (key: string) => string
) {
  const title = step.title ?? "";
  const stepId = step.id;

  if (step.titleParts) {
    return (
      <Text style={[styles.title, title.length > 58 ? styles.compactTitle : styles.largeTitle]}>
        {richInline(step.titleParts)}
      </Text>
    );
  }

  const titleBeforeName = step.titleBeforeName;
  const titleAfterName = step.titleAfterName;

  if (titleBeforeName || titleAfterName) {
    return (
      <Text style={[styles.title, styles.largeTitle]}>
        <Text style={styles.mutedText}>{titleBeforeName}</Text>
        <Text style={styles.strongText}>{name || "Lucas"}</Text>
        <Text style={styles.strongText}>{titleAfterName}</Text>
      </Text>
    );
  }

  if (stepId === "noted") {
    return (
      <Text style={[styles.title, styles.largeTitle]}>
        <Text style={styles.strongText}>{selectedRhythm}</Text>
        {"\n\n"}
        <Text style={styles.mutedText}>{t("onboarding.tutorial.steps.noted.line")}</Text>
        {"\n\n"}
        <Text style={styles.mutedText}>{t("onboarding.tutorial.steps.noted.objectivePrefix")}</Text>
        <Text style={styles.strongText}>{t("onboarding.tutorial.steps.noted.objectiveStrong")}</Text>
      </Text>
    );
  }

  return <Text style={[styles.title, title.length > 58 ? styles.compactTitle : styles.largeTitle]}>{title}</Text>;
}

function richInline(parts: OnboardingTextPart[]) {
  return parts.map((part, index) => (
    <Text key={`${part.text}-${index}`} style={part.strong ? styles.strongText : styles.mutedText}>
      {part.text}
    </Text>
  ));
}

function InfoBubbleReveal({
  children,
  isVisible,
}: {
  children: ReactNode;
  isVisible: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isVisible ? 1 : 0, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [isVisible, progress]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: -18 + progress.value * 18 }],
  }));

  return (
    <Animated.View
      pointerEvents={isVisible ? "auto" : "none"}
      style={revealStyle}
    >
      {children}
    </Animated.View>
  );
}

function SquircleNameInputPreview({
  isVisible,
  name,
  placeholder,
}: {
  isVisible: boolean;
  name: string;
  placeholder: string;
}) {
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [isVisible, opacity]);

  const previewStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: 10 - opacity.value * 10 }],
  }));

  return (
    <Animated.View style={previewStyle}>
      <Squircle style={styles.nameInputPreview}>
        <Text style={name ? styles.nameInputText : styles.nameInputPlaceholder}>
          {name || placeholder}
        </Text>
      </Squircle>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#EFEFEF",
    flex: 1,
  },
  stage: {
    alignSelf: "center",
    flex: 1,
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    left: 22,
    opacity: 0.3,
    position: "absolute",
    top: 52,
    width: 44,
    zIndex: 10,
  },
  logoutMenu: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    opacity: 0.3,
    position: "absolute",
    right: 22,
    width: 44,
    zIndex: 20,
  },
  character: {
    position: "absolute",
    zIndex: 6,
  },
  objectiveFloatingCard: {
    left: 22,
    position: "absolute",
    right: 22,
    zIndex: 3,
  },
  characterShadow: {
    position: "absolute",
    zIndex: 1,
  },
  content: {
    left: 22,
    position: "absolute",
    right: 22,
    zIndex: 4,
  },
  scrollableStep: {
    bottom: 0,
    left: 22,
    position: "absolute",
    right: 22,
    top: 0,
    zIndex: 4,
  },
  stepScrollContent: {
    flexGrow: 1,
  },
  longTermScrollContent: {
    paddingTop: 192,
  },
  trialScrollContent: {
    paddingTop: 258,
  },
  contentLow: {
    bottom: 120,
  },
  contentMiddle: {
    bottom: 80,
  },
  contentRaised: {
    bottom: 178,
  },
  contentHigh: {
    top: 150,
  },
  contentHighLower: {
    top: OBJECTIVE_SCREENS_CONTENT_TOP,
  },
  trialContent: {
    bottom: 104,
    top: 214,
  },
  bottom: {
    alignSelf: "center",
    position: "absolute",
    width: "64%",
    zIndex: 5,
  },
  inlineButton: {
    alignSelf: "center",
    marginTop: 22,
    width: "64%",
  },
  title: {
    color: "#7D7D7D",
    fontFamily: "Inter_24pt-SemiBold",
    letterSpacing: 0,
  },
  largeTitle: {
    fontSize: 27,
    lineHeight: 31,
  },
  compactTitle: {
    fontSize: 24,
    lineHeight: 28,
  },
  mutedText: {
    color: "#838383",
  },
  strongText: {
    color: "#050505",
  },
  textStack: {
    justifyContent: "flex-start",
    minHeight: 190,
  },
  nameStack: {
    gap: 22,
    justifyContent: "flex-start",
    minHeight: 250,
  },
  nameInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E4E4",
    borderRadius: 13,
    borderWidth: 1,
    color: "#111111",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 22,
    height: 58,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  nameInputPreview: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E4E4",
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  nameInputText: {
    color: "#111111",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 22,
    textAlign: "center",
  },
  nameInputPlaceholder: {
    color: "#B8B8B8",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 20,
    textAlign: "center",
  },
  questionStack: {
    gap: 18,
  },
  determinationStack: {
    gap: 14,
    paddingTop: 208,
  },
  infoStack: {
    gap: 16,
    marginBottom: 32,
  },
  infoBubbleSlot: {
    minHeight: 104,
  },
  sliderStack: {
    gap: 28,
    paddingHorizontal: 2,
  },
  objectiveStack: {
    gap: 18,
    minHeight: 260,
  },
  objectiveCard: {
    width: "100%",
  },
  objectiveCardPlaceholder: {
    minHeight: OBJECTIVE_CARD_HEIGHT,
    width: "100%",
  },
  topObjectiveCard: {
    marginBottom: 38,
    width: "100%",
  },
  questionObjectiveCard: {
    marginBottom: 6,
    width: "100%",
  },
  longTermStack: {
    gap: 17,
  },
  longTermFeatureStack: {
    gap: 9,
  },
  longTermCard: {
    marginBottom: 10,
    width: "100%",
  },
  trialStack: {
    alignItems: "center",
  },
  trialTitle: {
    textAlign: "center",
  },
  trialPhone: {
    height: 154,
    marginTop: 6,
    width: 150,
  },
  trialOfferBlock: {
    alignSelf: "stretch",
    marginTop: 4,
  },
  trialCoffeePill: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 6,
    minHeight: 46,
    paddingLeft: 18,
    paddingRight: 14,
  },
  trialCoffeeText: {
    color: "#4C4C4C",
    flex: 1,
    fontFamily: "Satoshi-Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  trialCoffeeImage: {
    height: 35,
    transform: [{ rotate: "18deg" }],
    width: 35,
  },
  trialPlans: {
    alignSelf: "stretch",
    gap: 7,
    marginTop: 10,
  },
  trialCaption: {
    color: "#535353",
    fontFamily: "Satoshi-Regular",
    fontSize: 16,
    lineHeight: 20,
    marginTop: 12,
    textAlign: "center",
  },
  trialOfferStatus: {
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    minHeight: 42,
  },
  trialOfferStatusText: {
    color: "#6A6A6A",
    fontFamily: "Satoshi-Regular",
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
  },
  trialRetryButton: {
    justifyContent: "center",
    minHeight: 22,
  },
  trialRetryText: {
    color: "#151515",
    fontFamily: "Satoshi-Bold",
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
