import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import SwitchItem from "@/components/switchItem";
import SimpleInput from "@/components/textInput";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { SquircleView } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useAppTranslation } from "@/lib/i18n";
import {
    NOTIFICATION_REMINDER_LIMITS,
    normalizeIntegerInput,
    parseIntegerInput,
    sanitizeNumericInput,
} from "@/lib/notificationLimits";
import { cancelDailyReminder, hasPendingDailyReminder, markReminderSyncPending, requestNotificationPermissions, scheduleDailyReminder, syncDailyReminderForProfile } from "@/lib/notificationService";
import { useSubscription } from "@/lib/subscription";
import { patchProfileCache } from "@/lib/profile";
import { supabaseProfileRepository } from "@/lib/profileRepository";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthUserId } from "@/lib/AuthSessionContext";
import { useQueryClient } from "@tanstack/react-query";


export default function NotificationsSettings() {

    const userId = useAuthUserId();
    const activeUserIdRef = useRef(userId);
    activeUserIdRef.current = userId;
    const savingRef = useRef(false);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { t } = useAppTranslation();
    const { colors } = useTheme();
    const {
        canUseNotificationReminders,
        canUseNotificationWeekends,
        isLoading: isSubscriptionLoading,
    } = useSubscription();
    const [isLoading, setIsLoading] = useState(true);
    const [profileLoaded, setProfileLoaded] = useState(false);


    const [initialAlertHour, setInitialAlertHour] = useState('');
    const [initialAlertMinute, setInitialAlertMinute] = useState('');
    const [initialAlertsEnabled, setInitialAlertsEnabled] = useState(false);
    const [initialInsistanceEnabled, setInitialInsistanceEnabled] = useState(false);
    const [initialInsistanceDelais, setInitialInsistanceDelais] = useState('');
    const [initialInsistanceRepetitions, setInitialInsistanceRepetitions] = useState('');


    const [alertHour, setAlertHour] = useState('');
    const [alertMinute, setAlertMinute] = useState('');
    const [alertsEnabled, setAlertsEnabled] = useState(false);
    
    const [insistanceEnabled, setInsistanceEnabled] = useState(false);
    const [insistanceDelais, setInsistanceDelais] = useState('');
    const [insistanceRepetitions, setInsistanceRepetitions] = useState('');
    
    const [initialWeekendEnabled, setInitialWeekendEnabled] = useState(false);
    const [weekendEnabled, setWeekendEnabled] = useState(false);
    
    const [isModified, setIsModified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [syncPending, setSyncPending] = useState(false);

    const normalizeInsistanceDelais = (value: string | number | null | undefined) =>
        normalizeIntegerInput(
            value,
            NOTIFICATION_REMINDER_LIMITS.delayMinutes.min,
            NOTIFICATION_REMINDER_LIMITS.delayMinutes.max
        );

    const normalizeInsistanceRepetitions = (value: string | number | null | undefined) =>
        normalizeIntegerInput(
            value,
            NOTIFICATION_REMINDER_LIMITS.repetitions.min,
            NOTIFICATION_REMINDER_LIMITS.repetitions.max
        );


    useEffect(() => {
        setIsLoading(true);
        setProfileLoaded(false);
        setSyncPending(false);
        if (userId && !isSubscriptionLoading) void initAlertSettings(userId);
        else if (!userId) setIsLoading(false);
    }, [userId, isSubscriptionLoading]);

    useEffect(() => {
        if (isSubscriptionLoading) {
            return;
        }

        if (!canUseNotificationReminders && insistanceEnabled) {
            setInsistanceEnabled(false);
        }

        if (!canUseNotificationWeekends && weekendEnabled) {
            setWeekendEnabled(false);
        }
    }, [
        canUseNotificationReminders,
        canUseNotificationWeekends,
        insistanceEnabled,
        isSubscriptionLoading,
        weekendEnabled,
    ]);

    const initAlertSettings = async (currentUserId: string) => {
        try {
            const data = await supabaseProfileRepository.get(
                currentUserId,
                'alertSetupHour, alertSetupMinute, alertSetupActive, alertInsistanceActive, alertInsistanceDelais, alertInsistanceRepetitions, alertWeekendsActive'
            );
            if (currentUserId !== activeUserIdRef.current) return;
            setProfileLoaded(true);
            const nextInsistanceDelais = normalizeInsistanceDelais(data.alertInsistanceDelais);
            const nextInsistanceRepetitions = normalizeInsistanceRepetitions(data.alertInsistanceRepetitions);
            setInitialAlertHour(data.alertSetupHour?.toString() || '');
            setInitialAlertMinute(data.alertSetupMinute?.toString() || '');
            setInitialAlertsEnabled(data.alertSetupActive || false);
            setInitialInsistanceEnabled(data.alertInsistanceActive || false);
            setInitialInsistanceDelais(nextInsistanceDelais);
            setInitialInsistanceRepetitions(nextInsistanceRepetitions);
            setInitialWeekendEnabled(data.alertWeekendsActive || false);
            setAlertHour(data.alertSetupHour?.toString() || '');
            setAlertMinute(data.alertSetupMinute?.toString() || '');
            setAlertsEnabled(data.alertSetupActive || false);
            setInsistanceEnabled(data.alertInsistanceActive || false);
            setInsistanceDelais(nextInsistanceDelais);
            setInsistanceRepetitions(nextInsistanceRepetitions);
            setWeekendEnabled(data.alertWeekendsActive || false);
            await syncDailyReminderForProfile(currentUserId, {
                ...data,
                alertInsistanceActive: canUseNotificationReminders && Boolean(data.alertInsistanceActive),
            });
            setSyncPending(await hasPendingDailyReminder(currentUserId));
        } catch (error) {
            if (currentUserId !== activeUserIdRef.current) return;
            setSyncPending(true);
            console.error("Erreur lors de la récupération des préférences de notification:", error);
            Alert.alert(t("common.alerts.errorTitle"), t("common.alerts.genericError"));
        } finally {
            if (currentUserId === activeUserIdRef.current) setIsLoading(false);
        }
    };


    useEffect(() => {
        const modified =
            alertHour !== initialAlertHour ||
            alertMinute !== initialAlertMinute ||
            alertsEnabled !== initialAlertsEnabled ||
            insistanceEnabled !== initialInsistanceEnabled ||
            insistanceDelais !== initialInsistanceDelais ||
            insistanceRepetitions !== initialInsistanceRepetitions ||
            weekendEnabled !== initialWeekendEnabled;
        setIsModified(modified);
    }, [alertHour, alertMinute, alertsEnabled, insistanceEnabled, insistanceDelais, insistanceRepetitions, weekendEnabled]);


    const save = async () => {
        if (savingRef.current || isLoading || !profileLoaded || !userId) return;
        const savingUserId = userId;
        const nextInsistanceEnabled = canUseNotificationReminders ? insistanceEnabled : false;
        const nextWeekendEnabled = canUseNotificationWeekends ? weekendEnabled : false;
        const hourNum = parseIntegerInput(alertHour);
        const minuteNum = parseIntegerInput(alertMinute);

        // Vérifier si l'heur est au format valide
        if (alertsEnabled) {
            if (hourNum === null || minuteNum === null || hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
                alert(t("common.alerts.invalidTime"));
                return;
            }
        }

        const delayNum = parseIntegerInput(insistanceDelais);
        const repetitionsNum = parseIntegerInput(insistanceRepetitions);

        if (
            nextInsistanceEnabled &&
            (
                delayNum === null ||
                delayNum < NOTIFICATION_REMINDER_LIMITS.delayMinutes.min ||
                delayNum > NOTIFICATION_REMINDER_LIMITS.delayMinutes.max
            )
        ) {
            alert(t("common.alerts.invalidReminderDelay", NOTIFICATION_REMINDER_LIMITS.delayMinutes));
            return;
        }

        if (
            nextInsistanceEnabled &&
            (
                repetitionsNum === null ||
                repetitionsNum < NOTIFICATION_REMINDER_LIMITS.repetitions.min ||
                repetitionsNum > NOTIFICATION_REMINDER_LIMITS.repetitions.max
            )
        ) {
            alert(t("common.alerts.invalidReminderRepetitions", NOTIFICATION_REMINDER_LIMITS.repetitions));
            return;
        }

        const nextInsistanceDelais = nextInsistanceEnabled && delayNum !== null
            ? `${delayNum}`
            : normalizeInsistanceDelais(insistanceDelais);
        const nextInsistanceRepetitions = nextInsistanceEnabled && repetitionsNum !== null
            ? `${repetitionsNum}`
            : normalizeInsistanceRepetitions(insistanceRepetitions);

        savingRef.current = true;
        setIsSaving(true);
        try {
            if (alertsEnabled) {
                const hasPermission = await requestNotificationPermissions();
                if (!hasPermission) throw new Error("Notifications non autorisées");
            }
            const patch = {
                alertSetupHour: alertHour, 
                alertSetupMinute: alertMinute, 
                alertSetupActive: alertsEnabled,
                alertInsistanceActive: nextInsistanceEnabled,
                alertInsistanceDelais: nextInsistanceDelais,
                alertInsistanceRepetitions: nextInsistanceRepetitions,
                alertWeekendsActive: nextWeekendEnabled
            };
            await markReminderSyncPending(savingUserId);
            await supabaseProfileRepository.patch(savingUserId, patch);
            patchProfileCache(queryClient, savingUserId, patch);
            const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser();
            if (sessionError) throw sessionError;
            if (currentUser?.id !== savingUserId || activeUserIdRef.current !== savingUserId) {
                throw new Error("Compte modifié pendant l'enregistrement des rappels");
            }
            if (alertsEnabled) {
                if (hourNum !== null && minuteNum !== null) {
                await scheduleDailyReminder(
                    savingUserId,
                    hourNum,
                    minuteNum,
                    nextInsistanceEnabled,
                    nextInsistanceDelais,
                    nextInsistanceRepetitions,
                    nextWeekendEnabled
                );
                }
            } else {
                await cancelDailyReminder(savingUserId);
            }
            setSyncPending(false);
        // Mettre à jour les valeurs initiales pour refléter les nouvelles préférences
        setInitialAlertHour(alertHour);
        setInitialAlertMinute(alertMinute);
        setInitialAlertsEnabled(alertsEnabled);
        setInitialInsistanceEnabled(nextInsistanceEnabled);
        setInitialInsistanceDelais(nextInsistanceDelais);
        setInitialInsistanceRepetitions(nextInsistanceRepetitions);
        setInitialWeekendEnabled(nextWeekendEnabled);
        setInsistanceEnabled(nextInsistanceEnabled);
        setInsistanceDelais(nextInsistanceDelais);
        setInsistanceRepetitions(nextInsistanceRepetitions);
        setWeekendEnabled(nextWeekendEnabled);
        setIsModified(false);
        } catch (error) {
            if (activeUserIdRef.current !== savingUserId) return;
            setSyncPending(true);
            console.error("Erreur lors de l'enregistrement des notifications:", error);
            Alert.alert(t("common.alerts.errorTitle"), t("common.alerts.genericError"));
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    };

    const toggleNotifications = async () => {
        if (alertsEnabled) {
            setAlertsEnabled(false);
        } else {
            setAlertsEnabled(true);
        }
    };

    const toggleInsistance = async (value: boolean) => {
        if (value && !canUseNotificationReminders) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings/premium");
            return;
        }

        setInsistanceEnabled(value);
    };

    const toggleWeekend = async (value: boolean) => {
        if (value && !canUseNotificationWeekends) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings/premium");
            return;
        }

        setWeekendEnabled(value);
    };


    return (

        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View
                style={{
                    marginBottom: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 20,
                    paddingHorizontal: 20,
                    paddingTop: 60
                }}
            >
                <SecondaryButton
                    onPress={() => router.back()}
                    image="chevron.left"
                />
                <Headline title={t("settings.notifications.headline.title")} subtitle={t("settings.notifications.headline.subtitle")} />
            </View>

            <SquircleView
                style={{
                    paddingHorizontal: 20,
                    paddingBottom: 15,
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    width: '90%',
                    alignSelf: 'center',
                }}
                cornerSmoothing={100} // 0-100
                preserveSmoothing={true} // false matches figma, true has more rounding
            >
                <SwitchItem
                    image="bell.fill"
                    title={t("settings.notifications.setup")}
                    event={toggleNotifications}
                    currentValue={alertsEnabled}
                />


                <View>
                    <SquircleView
                        cornerSmoothing={100} // 0-100
                        preserveSmoothing={true} // false matches figma, true has more rounding
                        style={{
                            width: '100%',
                            backgroundColor: colors.input,
                            borderRadius: 15,
                            paddingVertical: 8,
                            paddingLeft: 24,
                            paddingRight: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignSelf: 'center',
                        }}
                    >
                        <Text
                            style={{ color: colors.text, fontSize: 16, fontFamily: 'Satoshi-Regular' }}
                        >
                            {t("settings.notifications.time")}
                        </Text>

                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <SimpleInput
                                value={alertHour || ''}
                                onChangeText={setAlertHour}
                                placeholder="HH"
                                type="numeric"
                                returnKeyType="done"
                                isLoading={isLoading}
                                inputWidth={80}
                                style={{ textAlign: 'center' }}
                            />
                            <Text style={{ color: colors.text }}>
                                :
                            </Text>
                            <SimpleInput
                                value={alertMinute || ''}
                                onChangeText={setAlertMinute}
                                placeholder="HH"
                                type="numeric"
                                returnKeyType="done"
                                isLoading={isLoading}
                                inputWidth={80}
                                style={{ textAlign: 'center' }}
                            />
                        </View>
                    </SquircleView>
                </View>



            </SquircleView>

            <View style={styles.premiumSettingContainer}>
                {!canUseNotificationReminders ? (
                    <View style={styles.plusBadge}>
                        <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                    </View>
                ) : null}
                <SquircleView
                    style={{
                        paddingHorizontal: 20,
                        paddingBottom: 15,
                        backgroundColor: colors.card,
                        borderRadius: 20,
                        width: '100%',
                        alignSelf: 'center',
                    }}
                    cornerSmoothing={100}
                    preserveSmoothing={true}
                >
                    <SwitchItem
                        title={t("settings.notifications.insistence")}
                        event={toggleInsistance}
                        currentValue={insistanceEnabled}
                    />

                    <View>
                        <SquircleView
                            cornerSmoothing={100}
                            preserveSmoothing={true}
                            style={{
                                width: '100%',
                                backgroundColor: colors.input,
                                borderRadius: 15,
                                paddingTop: 12,
                                paddingBottom: 12,
                                paddingLeft: 24,
                                paddingRight: 12,
                                alignSelf: 'center',
                            }}
                        >
                            <View style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: 'space-between',
                                marginBottom: 8,
                            }}>
                                <View style={styles.insistenceLabel}>
                                    <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'Satoshi-Regular' }}>
                                        {t("settings.notifications.delay")}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Satoshi-Regular', marginTop: 2 }}>
                                        {t("settings.notifications.delayLimit", NOTIFICATION_REMINDER_LIMITS.delayMinutes)}
                                    </Text>
                                </View>

                                <SimpleInput
                                    value={insistanceDelais}
                                    onChangeText={(value) => setInsistanceDelais(sanitizeNumericInput(value, 3))}
                                    onBlur={() => setInsistanceDelais(normalizeInsistanceDelais(insistanceDelais))}
                                    placeholder="..."
                                    type="numeric"
                                    returnKeyType="done"
                                    isLoading={isLoading}
                                    inputWidth={120}
                                    editable={canUseNotificationReminders}
                                    style={[
                                        { textAlign: 'center' },
                                        !canUseNotificationReminders ? { opacity: 0.45 } : {},
                                    ]}
                                />
                            </View>

                            <View style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: 'space-between',
                            }}>
                                <View style={styles.insistenceLabel}>
                                    <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'Satoshi-Regular' }}>
                                        {t("settings.notifications.repetitions")}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Satoshi-Regular', marginTop: 2 }}>
                                        {t("settings.notifications.repetitionsLimit", NOTIFICATION_REMINDER_LIMITS.repetitions)}
                                    </Text>
                                </View>

                                <SimpleInput
                                    value={insistanceRepetitions}
                                    onChangeText={(value) => setInsistanceRepetitions(sanitizeNumericInput(value, 1))}
                                    onBlur={() => setInsistanceRepetitions(normalizeInsistanceRepetitions(insistanceRepetitions))}
                                    placeholder="..."
                                    type="numeric"
                                    returnKeyType="done"
                                    isLoading={isLoading}
                                    inputWidth={120}
                                    editable={canUseNotificationReminders}
                                    style={[
                                        { textAlign: 'center' },
                                        !canUseNotificationReminders ? { opacity: 0.45 } : {},
                                    ]}
                                />
                            </View>
                        </SquircleView>
                    </View>

                    <Text style={{
                        color: colors.textSecondary,
                        fontSize: 14,
                        lineHeight: 20,
                        marginTop: 15,
                        fontFamily: 'Satoshi-Regular',
                        paddingHorizontal: 5
                    }}>
                        {t("settings.notifications.description")}
                    </Text>

                </SquircleView>
            </View>

            <View style={styles.premiumSettingContainer}>
                {!canUseNotificationWeekends ? (
                    <View style={styles.plusBadge}>
                        <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                    </View>
                ) : null}
                <SquircleView
                    style={{
                        paddingHorizontal: 20,
                        backgroundColor: colors.card,
                        borderRadius: 20,
                        width: '100%',
                        alignSelf: 'center',
                    }}
                    cornerSmoothing={100}
                    preserveSmoothing={true}
                >
                    <SwitchItem
                        title={t("settings.notifications.weekends")}
                        event={toggleWeekend}
                        currentValue={weekendEnabled}
                    />
                </SquircleView>
            </View>

            <PrimaryButton
                title={t("common.actions.save")}
                onPress={save}
                style={{ width: '90%', alignSelf: 'center', marginTop: 30 }}
                disabled={(!isModified && !syncPending) || isSaving || isLoading || !profileLoaded || !userId}
            />


        </View>

    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    premiumSettingContainer: {
        alignSelf: "center",
        marginTop: 20,
        overflow: "visible",
        paddingTop: 8,
        position: "relative",
        width: "90%",
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
    insistenceLabel: {
        flex: 1,
        paddingRight: 12,
    },
});
