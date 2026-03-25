import NavItem from "@/components/navItem";
import Squircle from "@/components/Squircle";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { useEffect, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
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

    useEffect(() => {
        let isMounted = true;

        const loadUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && isMounted) {
                    setUser(user);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des données utilisateur:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadUserData();

        return () => {
            isMounted = false;
        };
    }, []);


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* <Headline title="Paramètres" subtitle="de l'application" /> */}



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
                    </View>



                </Squircle>

            }



            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                <NavItem image="profile" title="Compte" onPress={() => router.push(`/settings/account?id=${user.id}`)} />
                <NavItem image="notification" title="Notifications" onPress={() => router.push("/settings/notifications")} />
                <NavItem image="display" title="Affichage" onPress={() => router.push("/settings/display")} />
                {/* <SwitchItem image="display" title="Mode sombre" event={toggleTheme} currentValue={theme === 'dark'} /> */}

            </ScrollView>



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



        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 60,
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
