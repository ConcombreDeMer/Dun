import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import TextInput from "@/components/textInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    View
} from "react-native";
import { useTheme } from "../../lib/ThemeContext";
import { supabase } from "../../lib/supabase";

export default function Account() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const { id } = useLocalSearchParams();
    const [user, setUser] = useState<any>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDone, setIsDone] = useState(false);
    const [initialLastUpdateDate, setInitialLastUpdateDate] = useState<Date | null>(null);
    const queryClient = useQueryClient();

    const profileQuery = useQuery({
        queryKey: ['profile', id],
        queryFn: getProfile,
    });

    async function getProfile() {
        const { data, error } = await supabase
            .from("Profiles")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            throw new Error(error.message);
        }
        setName(data.name);
        setEmail(data.email);
        return data;
    }

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


    const updateProfileMutation = useMutation({
        mutationFn: async () => {
            if (!name.trim()) {
                return;
            }

            const { error } = await supabase
                .from("Profiles")
                .update({
                    name: name.trim(),
                    email: email.trim(),
                })
                .eq("id", id);
            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            setHasChanges(false);
        },
        onError: (error: any) => {
            console.error("Erreur lors de la sauvegarde:", error);
        }
    });


    useEffect(() => {
        if (profileQuery.data) {
            if (name !== profileQuery.data.name || email !== profileQuery.data.email) {
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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={{ marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 20 }}
            >
                <SecondaryButton
                    onPress={() => router.back()}
                    image="back"
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

                />

                <TextInput
                    name="Email"
                    placeholder="Votre email"
                    value={email}
                    onChangeText={setEmail}
                    isLoading={true}
                />

                {/* <Text style={{ color: '#383838ff', fontSize: 12, alignSelf: "center" }}>
                    Dernière mise à jour : {formatLastUpdateDate(profileQuery.data ? new Date(profileQuery.data.last_update_date) : null)}
                </Text> */}


                <View
                    style={styles.buttonsContainer}
                >
                    <PrimaryButton
                        title="Annuler"
                        type="reverse"
                        onPress={() => {
                            if (profileQuery.data) {
                                setName(profileQuery.data.name);
                                setEmail(profileQuery.data.email);
                                setHasChanges(false);
                            }
                        }}
                        disabled={!hasChanges}
                        size="M"
                    />

                    <PrimaryButton
                        title="Sauvegarder"
                        disabled={!hasChanges}
                        onPress={() => updateProfileMutation.mutate()}
                        size="M"
                    />

                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 60,
        backgroundColor: "#fff",
    },

    scrollContent: {
        marginTop: 20,
        paddingBottom: 120,
        gap: 24,
    },
    buttonsContainer: {
        width: '100%',
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },

});
