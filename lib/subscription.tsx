import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { initializeRevenueCat } from "./revenuecat";

export const REVENUECAT_ENTITLEMENT_ID = "dun_plus";

type SubscriptionPackages = {
  annual?: PurchasesPackage;
  monthly?: PurchasesPackage;
};

type SubscriptionContextValue = {
  activeEntitlement: CustomerInfo["entitlements"]["active"][string] | null;
  canUseAdvancedStats: boolean;
  canUsePremiumColorThemes: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  error: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  isPremium: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
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
    if (!appUserID) {
      setCurrentOffering(null);
      setIsConfigured(false);
      return;
    }

    const ready = initializeRevenueCat(appUserID);
    setIsConfigured(ready);

    if (!ready) {
      setCurrentOffering(null);
      return;
    }

    try {
      setError(null);
      const offerings = await Purchases.getOfferings();
      setCurrentOffering(offerings.current);
    } catch (e: any) {
      setCurrentOffering(null);
      setError(e?.message ?? "Unable to load subscription offers.");
      console.warn("Impossible de charger les offres RevenueCat:", e?.message ?? e);
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

  const showManageSubscriptions = useCallback(async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Unavailable", "Subscription management is only configured for iOS right now.");
      return;
    }

    await Purchases.showManageSubscriptions();
  }, []);

  const activeEntitlement = useMemo(() => getPremiumEntitlement(customerInfo), [customerInfo]);
  const isPremium = Boolean(activeEntitlement);
  const packages = useMemo(() => getPackages(currentOffering), [currentOffering]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    activeEntitlement,
    canUseAdvancedStats: isPremium,
    canUsePremiumColorThemes: isPremium,
    customerInfo,
    currentOffering,
    error,
    isConfigured,
    isLoading,
    isPremium,
    isPurchasing,
    isRestoring,
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
