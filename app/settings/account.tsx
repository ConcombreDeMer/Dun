import Headline from "@/components/headline";
import PopUpModal from "@/components/popUpModal";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import TextInput from "@/components/textInput";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useTheme } from "../../lib/ThemeContext";
import { supabase } from "../../lib/supabase";


interface UserData {
    name: string;
    email: string;
}

export default function Account() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const { id } = useLocalSearchParams();
    const [hasChanges, setHasChanges] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [userData, setUserData] = useState<UserData>();
    const [newEmail, setNewEmail] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', message: '' });
    const queryClient = useQueryClient();

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // console.log("user", user);
                setUserData(
                    {
                        name: user.user_metadata.name || '',
                        email: user.email || '',
                    }
                );
                if (user.new_email) {
                    setNewEmail(user.new_email);
                }
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    useEffect(() => {
        if (!userData) return;
        // console.log("userData", userData);
        setEmail(userData.email || '');
        setName(userData.name || '');
    }, [userData]);

    const formatLastUpdateDate = (date: Date | null): string => {
        if (!date) return "";

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);

        // Si la différence est inférieure à 10 minutes

        if (diffSeconds == 0) {
            return `à l'instant`;
        }

        if (diffMinutes < 10) {
            if (diffSeconds < 60) {
                return `il y a ${diffSeconds} secondes`;
            } else {
                return `il y a ${diffMinutes} minutes`;
            }
        }

        // Sinon, afficher le format complet
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const secondes = date.getSeconds().toString().padStart(2, "0");

        return `${day}/${month}/${year} à ${hours}:${minutes}:${secondes}`;
    };

    useEffect(() => {
        if (userData) {
            if (name !== userData.name || email !== userData.email) {
                setHasChanges(true);
            }
            else {
                setHasChanges(false);
            }
        }
        else {
            setHasChanges(false);
        }
    }, [name, email]);

    useEffect(() => {
        // console.log("hasChanges", hasChanges);
    }, [hasChanges]);

    //  utiliser onAuthStateChange pour détecter les changements d'email
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // console.log("Auth event:", event);
            if (event === 'USER_UPDATED') {
                console.log("L'utilisateur a mis à jour son email.");
                fetchUserData();
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);


    const handleSave = async () => {

        if (!hasChanges) return;
        // si l'email a changé, on doit vérifier qu'il est valide
        if (email !== userData?.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert("Veuillez entrer un email valide.");
                return;
            }
            setShowModal(true);
        }

        if (name !== userData?.name) {
            const { data, error } = await supabase.auth.updateUser(
                { data: { name: name } }
            )
            if (error) {
                console.error("Erreur lors de la mise à jour du nom d'utilisateur : " + error.message);
                return;
            }
            console.log("Nom d'utilisateur mis à jour avec succès.");
            setHasChanges(false);
        }

        // updateProfileMutation.mutate();
    }

    const seeMore = () => {
        router.push("/settings/changeEmail");
    }

    const sendChangeEmailConfirmation = async () => {
        const { data, error } = await supabase.auth.updateUser(
            { email: email },
            { emailRedirectTo: "dun://settings/changeEmail" }
        )
        if (error) {
            console.error("Erreur lors de la mise à jour de l'email : " + error.message);
            return;
        }
        console.log("Un email de confirmation a été envoyé à votre nouvelle adresse email.");
    }


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <PopUpModal
                symbolName="mail"
                isVisible={showModal}
                title="Changement d'email"
                message="Vous venez de renseigner un nouvel email. Etes vous sûr de vouloir continuer ? Un email de confirmation va vous être envoyé."
                onConfirm={() => {
                    // Gérer l'action de confirmation
                    console.log("Confirmé");
                    setShowModal(false);
                    sendChangeEmailConfirmation();
                }}
                onCancel={() => {
                    // Gérer l'action d'annulation
                    console.log("Annulé");
                    setShowModal(false);
                }}
                confirmText="Confirmer"
                cancelText="Annuler"
            />
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
                <Headline title="Compte" subtitle="Gérer votre compte" />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >


                <TextInput
                    name="Nom d'utilisateur"
                    placeholder="Votre nom d'utilisateur"
                    value={name}
                    onChangeText={setName}
                    isLoading={isLoading}
                />

                <View>

                    <TextInput
                        name="Email"
                        placeholder="Votre email"
                        value={email}
                        onChangeText={setEmail}
                        isLoading={isLoading}
                    />

                    {newEmail.length > 0 &&

                        <Animated.View
                            entering={FadeInUp.springify()}
                            exiting={FadeOutUp.springify()}
                            style={styles.alertEmail}
                        >
                            <View>
                                <Text
                                    style={{ color: '#a5a5a5' }}
                                >
                                    Un changement d'email est en cours vers :
                                </Text>
                                <Text
                                    style={{ color: '#fff', fontWeight: '500' }}
                                >
                                    {newEmail}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.alerteEmailButton}
                                onPress={seeMore}
                            >
                                <SymbolView
                                    name="eye"
                                    style={styles.symbol}
                                    type="palette"
                                    tintColor={'#000000'}
                                />
                            </TouchableOpacity>


                        </Animated.View>

                    }

                </View>



                {/* <Text style={{ color: '#383838ff', fontSize: 12, alignSelf: "center" }}>
                    Dernière mise à jour : {formatLastUpdateDate(profileQuery.data ? new Date(profileQuery.data.last_update_date) : null)}
                </Text> */}



            </ScrollView>
            <View
                style={styles.buttonsContainer}
            >
                <PrimaryButton
                    title="Sauvegarder"
                    disabled={!hasChanges}
                    onPress={handleSave}
                    size="M"
                />

                <PrimaryButton
                    title="Annuler"
                    type="reverse"
                    onPress={() => {
                        if (userData) {
                            setName(userData.name);
                            setEmail(userData.email);
                            setHasChanges(false);
                        }
                    }}
                    disabled={!hasChanges}
                    size="M"
                />

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    symbol: {
        width: 35,
        height: 35,
        margin: 5,
    },

    alertEmail: {
        backgroundColor: '#272727ff',
        borderRadius: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },

    alerteEmailButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff20',
        borderRadius: 5,
        borderWidth: 0.5,
        borderColor: '#ffffff40',
    },

    scrollContent: {
        marginTop: 20,
        paddingBottom: 120,
        gap: 24,
        paddingHorizontal: 20,
    },
    buttonsContainer: {
        width: '100%',
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        position: 'absolute',
        bottom: 40,
        height: 150,
        alignSelf: 'center',
    },

});
