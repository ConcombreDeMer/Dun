import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import SwitchItem from "@/components/switchItem";
import SimpleInput from "@/components/textInput";
import { useRouter } from "expo-router";
import { SquircleView } from "expo-squircle-view";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTranslation } from "../../lib/i18n";
import { cancelDailyReminder, requestNotificationPermissions, scheduleDailyReminder } from "../../lib/notificationService";
import { supabase } from "../../lib/supabase";
import { useStore } from "../../store/store";


export default function NotificationsSettings() {

    const store = useStore();
    const router = useRouter();
    const { t } = useAppTranslation();
    const [isLoading, setIsLoading] = useState(true);


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


    useEffect(() => {
        initAlertSettings();
    }, []);

    const initAlertSettings = async () => {
        const { data, error } = await supabase
            .from('Profiles')
            .select('alertSetupHour, alertSetupMinute, alertSetupActive, alertInsistanceActive, alertInsistanceDelais, alertInsistanceRepetitions, alertWeekendsActive')
            .eq('id', store.user.id)
            .single();

        if (error) {
            console.error("Erreur lors de la récupération des préférences de notification:", error);
        } else if (data) {

            setInitialAlertHour(data.alertSetupHour || '');
            setInitialAlertMinute(data.alertSetupMinute || '');
            setInitialAlertsEnabled(data.alertSetupActive || false);
            setInitialInsistanceEnabled(data.alertInsistanceActive || false);
            setInitialInsistanceDelais(data.alertInsistanceDelais || '');
            setInitialInsistanceRepetitions(data.alertInsistanceRepetitions || '');
            setInitialWeekendEnabled(data.alertWeekendsActive || false);

            setAlertHour(data.alertSetupHour || '');
            setAlertMinute(data.alertSetupMinute || '');
            setAlertsEnabled(data.alertSetupActive || false);
            setInsistanceEnabled(data.alertInsistanceActive || false);
            setInsistanceDelais(data.alertInsistanceDelais || '');
            setInsistanceRepetitions(data.alertInsistanceRepetitions || '');
            setWeekendEnabled(data.alertWeekendsActive || false);
        }
        setIsLoading(false);
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
        // Vérifier si l'heur est au format valide
        if (alertsEnabled) {
            const hourNum = parseInt(alertHour);
            const minuteNum = parseInt(alertMinute);

            if (isNaN(hourNum) || isNaN(minuteNum) || hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
                alert(t("common.alerts.invalidTime"));
                return;
            }
        }
        // Envoyer les préférences de notification à Supabase
        const { error: updateError } = await supabase
            .from('Profiles')
            .update({ 
                alertSetupHour: alertHour, 
                alertSetupMinute: alertMinute, 
                alertSetupActive: alertsEnabled,
                alertInsistanceActive: insistanceEnabled,
                alertInsistanceDelais: insistanceDelais,
                alertInsistanceRepetitions: insistanceRepetitions,
                alertWeekendsActive: weekendEnabled
            })
            .eq('id', store.user.id);
        if (updateError) {
            console.error("Erreur lors de la mise à jour de l'heure de notification:", updateError);
        }
        // Mettre à jour les notifications sur l'appareil
        if (alertsEnabled) {
            const hasPermission = await requestNotificationPermissions();
            if (hasPermission) {
                await scheduleDailyReminder(
                    parseInt(alertHour), 
                    parseInt(alertMinute),
                    insistanceEnabled,
                    insistanceDelais,
                    insistanceRepetitions,
                    weekendEnabled
                );
            }
        } else {
            await cancelDailyReminder();
        }
        // Mettre à jour les valeurs initiales pour refléter les nouvelles préférences
        setInitialAlertHour(alertHour);
        setInitialAlertMinute(alertMinute);
        setInitialAlertsEnabled(alertsEnabled);
        setInitialInsistanceEnabled(insistanceEnabled);
        setInitialInsistanceDelais(insistanceDelais);
        setInitialInsistanceRepetitions(insistanceRepetitions);
        setInitialWeekendEnabled(weekendEnabled);
        setIsModified(false);
    };

    const toggleNotifications = async () => {
        if (alertsEnabled) {
            setAlertsEnabled(false);
        } else {
            setAlertsEnabled(true);
        }
    };


    return (

        <View
            style={styles.container}
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
                    backgroundColor: "#ffffff",
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
                            backgroundColor: "#F5F5F5",
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
                            style={{ color: "#333", fontSize: 16, fontFamily: 'Satoshi-Regular' }}
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
                            <Text>
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

            <SquircleView
                style={{
                    paddingHorizontal: 20,
                    paddingBottom: 15,
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    width: '90%',
                    alignSelf: 'center',
                    marginTop: 20,
                }}
                cornerSmoothing={100}
                preserveSmoothing={true}
            >
                <SwitchItem
                    title={t("settings.notifications.insistence")}
                    event={setInsistanceEnabled}
                    currentValue={insistanceEnabled}
                />

                <View>
                    <SquircleView
                        cornerSmoothing={100}
                        preserveSmoothing={true}
                        style={{
                            width: '100%',
                            backgroundColor: "#F5F5F5",
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
                            <Text style={{ color: "#333", fontSize: 16, fontFamily: 'Satoshi-Regular' }}>
                                {t("settings.notifications.delay")}
                            </Text>

                            <SimpleInput
                                value={insistanceDelais}
                                onChangeText={setInsistanceDelais}
                                placeholder="..."
                                type="numeric"
                                returnKeyType="done"
                                isLoading={isLoading}
                                inputWidth={120}
                                style={{ textAlign: 'center', backgroundColor: '#e5e5e5' }}
                            />
                        </View>
                        
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: 'space-between',
                        }}>
                            <Text style={{ color: "#333", fontSize: 16, fontFamily: 'Satoshi-Regular' }}>
                                {t("settings.notifications.repetitions")}
                            </Text>

                            <SimpleInput
                                value={insistanceRepetitions}
                                onChangeText={setInsistanceRepetitions}
                                placeholder="..."
                                type="numeric"
                                returnKeyType="done"
                                isLoading={isLoading}
                                inputWidth={120}
                                style={{ textAlign: 'center', backgroundColor: '#e5e5e5' }}
                            />
                        </View>
                    </SquircleView>
                </View>

                <Text style={{
                    color: "#999999",
                    fontSize: 14,
                    lineHeight: 20,
                    marginTop: 15,
                    fontFamily: 'Satoshi-Regular',
                    paddingHorizontal: 5
                }}>
                    {t("settings.notifications.description")}
                </Text>

            </SquircleView>

            <SquircleView
                style={{
                    paddingHorizontal: 20,
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    width: '90%',
                    alignSelf: 'center',
                    marginTop: 20,
                }}
                cornerSmoothing={100}
                preserveSmoothing={true}
            >
                <SwitchItem
                    title={t("settings.notifications.weekends")}
                    event={setWeekendEnabled}
                    currentValue={weekendEnabled}
                />
            </SquircleView>

            <PrimaryButton
                title={t("common.actions.save")}
                onPress={save}
                style={{ width: '90%', alignSelf: 'center', marginTop: 30 }}
                disabled={!isModified}
            />


        </View>

    );
}


const styles = StyleSheet.create({
    container: {
    },
});
