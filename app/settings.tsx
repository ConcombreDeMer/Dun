import NavItem from "@/components/navItem";
import PopUpContainer from "@/components/popUpContainer";
import PrimaryButton from "@/components/primaryButton";
import Squircle from "@/components/Squircle";
import SwitchItem from "@/components/switchItem";
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
import { useFont } from "../lib/FontContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";


export default function Settings() {
    const router = useRouter();
    const { theme, toggleTheme, colors } = useTheme();
    const { fontSizes } = useFont();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
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
                if (typeof customerInfo.entitlements.active['Dun Pro'] !== "undefined") {
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
                    setIsLoading(false);
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
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setShowReposModal(false);
            router.push('/rest');
        }
    }




    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* <Headline title="Paramètres" subtitle="de l'application" /> */}
            <View
                style={{
                    width: '100%',
                    height: '100%',
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingTop: 60,
                }}
            >




                {user &&

                    <Squircle
                        style={styles.header}
                    >

                        <View
                            style={styles.left}
                        >
                            <Image
                                source={{ uri: user.user_metadata.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }}
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                }}
                            />

                        </View>

                        <View
                            style={styles.right}
                        >
                            <Text
                                style={{
                                    color: '#fff',
                                    fontSize: fontSizes['2xl'],
                                    fontWeight: '600',
                                    marginBottom: 4,
                                }}
                            >
                                {user.user_metadata.name || "Utilisateur"}
                            </Text>

                            <Text
                                style={{
                                    color: '#fff',
                                    fontSize: fontSizes.lg,
                                    fontWeight: '300',
                                    opacity: 0.8,
                                }}
                            >
                                {user.email}
                            </Text>
                            {
                                isSubscribed && (
                                    <Text
                                        style={{
                                            color: "#FFBB00",
                                            fontSize: fontSizes.sm,
                                            fontWeight: '500',
                                            marginTop: 4,
                                        }}
                                    >
                                        Abonné à Dun Plus
                                    </Text>

                                )
                            }

                        </View>



                    </Squircle>

                }



                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >

                    <NavItem image="person.fill" title="Compte" onPress={() => router.push(`/settings/account?id=${user.id}`)} />
                    <NavItem image="bell.fill" title="Notifications" onPress={() => router.push("/settings/notifications")} />
                    <NavItem image="display" title="Affichage" onPress={() => router.push("/settings/display")} />
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
                            title="Daily"
                            event={toggleDaily}
                            currentValue={dailyEnabled}
                        />

                    </Squircle>

                    <NavItem image="powersleep" title="Repos" onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowReposModal(true);
                    }} />
                    {/* <SwitchItem image="display" title="Mode sombre" event={toggleTheme} currentValue={theme === 'dark'} /> */}

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
                                    Atteint ton potentiel maximal
                                </Text>

                            </View>



                            <Image
                                source={require("../assets/images/character/16.png")}
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
                children={
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ overflow: 'hidden', height: 420, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                                <Image
                                    source={require('@/assets/images/character/19.png')}
                                    style={{ width: 120, height: 120 }}
                                    resizeMode="contain"
                                />
                                <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['3xl'], textAlign: 'center' }}>
                                    Aujourd'hui c'est <Text style={{ fontFamily: 'Satoshi-Bold' }}>repos</Text> !
                                </Text>

                                <Text
                                    style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                                >
                                    Cette journée ne sera pas
                                    répertoriée dans les statistiques
                                    et tes tâches en suspens sont
                                    reportées à ta prochaine journée active
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
                                    title="Confirmer"
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
                                    <PrimaryButton title="Annuler" type="reverse" onPress={() => setShowReposModal(false)} />
                                </View>
                            </View>

                        </View>
                    </TouchableWithoutFeedback>
                }
            />



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

    header: {
        backgroundColor: "#272727ff",
        height: 115,
        width: "100%",
        borderRadius: 30,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingHorizontal: 15,
        gap: 15,
    },

    left: {
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },


    right: {
        position: "relative",
    },



    scrollContent: {
        marginTop: 12,
        paddingBottom: 120,
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },


});
