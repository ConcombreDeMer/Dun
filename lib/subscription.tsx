import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { initializeRevenueCat } from "./revenuecat";

export const REVENUECAT_ENTITLEMENT_ID = "dun_plus";
export type TrialEligibilityStatus = "eligible" | "ineligible" | "unknown";

const BETA_PREMIUM_ENABLED = ["1", "true", "yes", "on"].includes(
  process.env.EXPO_PUBLIC_BETA_PREMIUM?.trim().toLowerCase() ?? ""
);

type SubscriptionPackages = {
  annual?: PurchasesPackage;
  monthly?: PurchasesPackage;
};

type SubscriptionContextValue = {
  activeEntitlement: CustomerInfo["entitlements"]["active"][string] | null;
  canUseAdvancedStats: boolean;
  canUseNotificationReminders: boolean;
  canUseNotificationWeekends: boolean;
  canUsePremiumColorThemes: boolean;
  canUseTaskBox: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  error: string | null;
  isConfigured: boolean;
  isBetaPremium: boolean;
  isLoading: boolean;
  isPremium: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  checkTrialEligibility: (productIdentifier: string) => Promise<TrialEligibilityStatus>;
  loadOfferings: () => Promise<void>;
  packages: SubscriptionPackages;
  purchasePackage: (packageToBuy: PurchasesPackage) => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  showManageSubscriptions: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

function getPremiumEntitlement(customerInfo: CustomerInfo | null) {
  return customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ?? null;
}

function getPackages(offering: PurchasesOffering | null): SubscriptionPackages {
  const availablePackages = offering?.availablePackages ?? [];

  return {
    annual: availablePackages.find((pack) => pack.packageType === "ANNUAL"),
    monthly: availablePackages.find((pack) => pack.packageType === "MONTHLY"),
  };
}

type SubscriptionProviderProps = {
  appUserID?: string | null;
  children: ReactNode;
};

export function SubscriptionProvider({ appUserID, children }: SubscriptionProviderProps) {
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const resetTimeout = setTimeout(() => {
      setCurrentOffering(null);
      setCustomerInfo(null);
      setError(null);
      setIsLoading(Boolean(appUserID));
    }, 0);

    return () => {
      clearTimeout(resetTimeout);
    };
  }, [appUserID]);

  const refreshSubscription = useCallback(async () => {
    if (!appUserID) {
      setCustomerInfo(null);
      setIsConfigured(false);
      setIsLoading(false);
      return;
    }

    const ready = initializeRevenueCat(appUserID);
    setIsConfigured(ready);

    if (!ready) {
      setCustomerInfo(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const nextCustomerInfo = await Purchases.getCustomerInfo();
      setCustomerInfo(nextCustomerInfo);
    } catch (e: any) {
      setError(e?.message ?? "Unable to load subscription information.");
      console.warn("Impossible de rafraîchir l'abonnement RevenueCat:", e?.message ?? e);
    } finally {
      setIsLoading(false);
    }
  }, [appUserID]);

  const loadOfferings = useCallback(async () => {
    const debugPrefix = "[RevenueCat Offerings]";

    console.log(`${debugPrefix} start`, {
      appUserID,
      hasApiKey: Boolean(process.env.EXPO_PUBLIC_REVENUECAT_KEY?.trim()),
      platform: Platform.OS,
    });

    if (!appUserID) {
      console.log(`${debugPrefix} skipped: missing appUserID`);
      setCurrentOffering(null);
      setIsConfigured(false);
      return;
    }

    const ready = initializeRevenueCat(appUserID);
    setIsConfigured(ready);

    if (!ready) {
      console.log(`${debugPrefix} skipped: RevenueCat not configured`);
      setCurrentOffering(null);
      return;
    }

    try {
      setError(null);
      const offerings = await Purchases.getOfferings();

      console.log(`${debugPrefix} received`, {
        allOfferingIdentifiers: Object.keys(offerings.all ?? {}),
        currentOfferingIdentifier: offerings.current?.identifier ?? null,
        currentPackageCount: offerings.current?.availablePackages.length ?? 0,
        currentPackages: offerings.current?.availablePackages.map((pack) => ({
          identifier: pack.identifier,
          packageType: pack.packageType,
          productIdentifier: pack.product.identifier,
          productTitle: pack.product.title,
          productPrice: pack.product.priceString,
          productType: pack.product.productType,
          subscriptionPeriod: pack.product.subscriptionPeriod,
        })) ?? [],
      });

      setCurrentOffering(offerings.current);
    } catch (e: any) {
      setCurrentOffering(null);
      setError(e?.message ?? "Unable to load subscription offers.");
      console.warn(`${debugPrefix} failed`, {
        code: e?.code,
        message: e?.message,
        readableErrorCode: e?.readableErrorCode,
        underlyingErrorMessage: e?.underlyingErrorMessage,
        userInfo: e?.userInfo,
      });
    }
  }, [appUserID]);

  useEffect(() => {
    const refreshTimeout = setTimeout(() => {
      void refreshSubscription();
    }, 0);

    const customerInfoListener = (nextCustomerInfo: CustomerInfo) => {
      setCustomerInfo(nextCustomerInfo);
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      clearTimeout(refreshTimeout);
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [refreshSubscription]);

  const purchasePackage = useCallback(async (packageToBuy: PurchasesPackage) => {
    setIsPurchasing(true);

    try {
      const { customerInfo: nextCustomerInfo } = await Purchases.purchasePackage(packageToBuy);
      setCustomerInfo(nextCustomerInfo);
      return Boolean(getPremiumEntitlement(nextCustomerInfo));
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);

    try {
      const nextCustomerInfo = await Purchases.restorePurchases();
      setCustomerInfo(nextCustomerInfo);
      return Boolean(getPremiumEntitlement(nextCustomerInfo));
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const checkTrialEligibility = useCallback(async (productIdentifier: string): Promise<TrialEligibilityStatus> => {
    if (!appUserID || !productIdentifier) {
      return "unknown";
    }

    const ready = initializeRevenueCat(appUserID);
    setIsConfigured(ready);

    if (!ready) {
      return "unknown";
    }

    try {
      const eligibilityByProduct = await Purchases.checkTrialOrIntroductoryPriceEligibility([productIdentifier]);
      const status = eligibilityByProduct[productIdentifier]?.status;

      if (status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE) {
        return "ineligible";
      }

      if (status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) {
        return "eligible";
      }
    } catch (e: any) {
      console.warn("Impossible de vérifier l'éligibilité à l'offre d'introduction:", e?.message ?? e);
    }

    return "unknown";
  }, [appUserID]);

  const showManageSubscriptions = useCallback(async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Unavailable", "Subscription management is only configured for iOS right now.");
      return;
    }

    await Purchases.showManageSubscriptions();
  }, []);

  const activeEntitlement = useMemo(() => getPremiumEntitlement(customerInfo), [customerInfo]);
  const isPremium = BETA_PREMIUM_ENABLED || Boolean(activeEntitlement);
  const packages = useMemo(() => getPackages(currentOffering), [currentOffering]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    activeEntitlement,
    canUseAdvancedStats: isPremium,
    canUseNotificationReminders: isPremium,
    canUseNotificationWeekends: isPremium,
    canUsePremiumColorThemes: isPremium,
    canUseTaskBox: isPremium,
    customerInfo,
    currentOffering,
    error,
    isConfigured,
    isBetaPremium: BETA_PREMIUM_ENABLED,
    isLoading,
    isPremium,
    isPurchasing,
    isRestoring,
    checkTrialEligibility,
    loadOfferings,
    packages,
    purchasePackage,
    refreshSubscription,
    restorePurchases,
    showManageSubscriptions,
  }), [
    activeEntitlement,
    customerInfo,
    currentOffering,
    error,
    isConfigured,
    isLoading,
    isPremium,
    isPurchasing,
    isRestoring,
    checkTrialEligibility,
    loadOfferings,
    packages,
    purchasePackage,
    refreshSubscription,
    restorePurchases,
    showManageSubscriptions,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error("useSubscription doit être utilisé dans un SubscriptionProvider");
  }

  return context;
}
