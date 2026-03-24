import Headline from "@/components/headline";
import NavItem from "@/components/navItem";
import PopUpContainer from "@/components/popUpContainer";
import SecondaryButton from "@/components/secondaryButton";
import SettingItem from "@/components/settingItem";
import Squircle from "@/components/Squircle";
import SimpleInput from "@/components/textInput";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SquircleButton, SquircleView } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import Animated, { FadeInUp, FadeOutUp, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useFont } from "../../lib/FontContext";
import { deleteUserAccount, supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/ThemeContext";
import { useStore } from "../../store/store";


interface UserData {
    name: string;
    email: string;
}

export default function Account() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const { id } = useLocalSearchParams();
    const [hasChanges, setHasChanges] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isCheckingPassword, setIsCheckingPassword] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    
    // Nouveaux états pour le mot de passe
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [userData, setUserData] = useState<UserData>();
    const [newEmail, setNewEmail] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', message: '' });
    const queryClient = useQueryClient();
    const store = useStore();
    const { fontSizes } = useFont();

    const screenWidth = Dimensions.get('window').width;
    const page1X = useSharedValue(0);
    const page2X = useSharedValue(screenWidth);
    const page3X = useSharedValue(screenWidth * 2);

    const page1AnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: page1X.value }],
        };
    });

    const page2AnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: page2X.value }],
        };
    });

    const page3AnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: page3X.value }],
        };
    });

    // --- Animations pour la modale Mdp ---
    const passPage1X = useSharedValue(0);
    const passPage2X = useSharedValue(screenWidth);
    const passPage3X = useSharedValue(screenWidth * 2);

    const passPage1AnimatedStyle = useAnimatedStyle(() => {
        return { transform: [{ translateX: passPage1X.value }] };
    });
    const passPage2AnimatedStyle = useAnimatedStyle(() => {
        return { transform: [{ translateX: passPage2X.value }] };
    });
    const passPage3AnimatedStyle = useAnimatedStyle(() => {
        return { transform: [{ translateX: passPage3X.value }] };
    });

    const handleNext1 = async () => {
        if (!password) {
            Alert.alert("Erreur", "Veuillez entrer votre mot de passe.");
            return;
        }

        setIsCheckingPassword(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: userData?.email || '',
            password: password,
        });
        setIsCheckingPassword(false);

        if (error) {
            Alert.alert("Erreur", "Mot de passe incorrect.");
            return;
        }

        page1X.value = withSpring(-screenWidth);
        page2X.value = withSpring(0);
        page3X.value = withSpring(screenWidth);
    };

    const handleNext2 = async () => {
        if (!newEmailInput) {
            Alert.alert("Erreur", "Veuillez entrer un nouvel email.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmailInput)) {
            Alert.alert("Erreur", "Veuillez entrer un email valide.");
            return;
        }

        if (newEmailInput.trim().toLowerCase() === userData?.email?.toLowerCase()) {
            Alert.alert("Erreur", "Le nouvel email doit être différent de l'actuel.");
            return;
        }

        setIsCheckingEmail(true);
        const { data: emailExists, error: fetchError } = await supabase
            .rpc('email_exists', { email_input: newEmailInput.trim() });

        if (fetchError) {
            console.error('Erreur:', fetchError);
            Alert.alert('Erreur', 'Erreur lors de la vérification de l\'email.');
            setIsCheckingEmail(false);
            return;
        }

        if (emailExists) {
            Alert.alert('Erreur', 'Cette adresse email est déjà utilisée.');
            setIsCheckingEmail(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser(
            { email: newEmailInput.trim() },
            { emailRedirectTo: "dun://settings/changeEmail" }
        )

        setIsCheckingEmail(false);

        if (updateError) {
            console.error("Erreur lors de la mise à jour de l'email : " + updateError.message);
            Alert.alert("Erreur", "Une erreur est survenue lors du changement d'email.");
            return;
        }

        page1X.value = withSpring(-screenWidth * 2);
        page2X.value = withSpring(-screenWidth);
        page3X.value = withSpring(0);
    };

    const handleBack1 = () => {
        page1X.value = withSpring(0);
        page2X.value = withSpring(screenWidth);
        page3X.value = withSpring(screenWidth * 2);
    };

    const handleBack2 = () => {
        page1X.value = withSpring(-screenWidth);
        page2X.value = withSpring(0);
        page3X.value = withSpring(screenWidth);
    };

    useEffect(() => {
        if (!showModal) {
            page1X.value = 0;
            page2X.value = screenWidth;
            page3X.value = screenWidth * 2;
        }
    }, [showModal]);

    // --- Fonctions pour la modale Mdp ---
    const handlePassNext1 = async () => {
        if (!oldPassword) {
            Alert.alert("Erreur", "Veuillez entrer votre mot de passe actuel.");
            return;
        }

        setIsCheckingPassword(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: userData?.email || '',
            password: oldPassword,
        });
        setIsCheckingPassword(false);

        if (error) {
            Alert.alert("Erreur", "Mot de passe incorrect.");
            return;
        }

        passPage1X.value = withSpring(-screenWidth);
        passPage2X.value = withSpring(0);
        passPage3X.value = withSpring(screenWidth);
    };

    const handlePassNext2 = async () => {
        if (!newPassword) {
            Alert.alert("Erreur", "Veuillez entrer un nouveau mot de passe.");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setIsUpdatingPassword(true);
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });
        setIsUpdatingPassword(false);

        if (updateError) {
            console.error("Erreur Mdp : " + updateError.message);
            Alert.alert("Erreur", "Une erreur est survenue lors du changement de mot de passe.");
            return;
        }

        passPage1X.value = withSpring(-screenWidth * 2);
        passPage2X.value = withSpring(-screenWidth);
        passPage3X.value = withSpring(0);
    };

    const handlePassBack1 = () => {
        passPage1X.value = withSpring(0);
        passPage2X.value = withSpring(screenWidth);
        passPage3X.value = withSpring(screenWidth * 2);
    };

    useEffect(() => {
        if (!showPasswordModal) {
            passPage1X.value = 0;
            passPage2X.value = screenWidth;
            passPage3X.value = screenWidth * 2;
            setOldPassword('');
            setNewPassword('');
        }
    }, [showPasswordModal]);


    useEffect(() => {
        let isMounted = true;

        const loadUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && isMounted) {
                    setUserData({
                        name: user.user_metadata.name || '',
                        email: user.email || '',
                    });
                    if (user.new_email) {
                        setNewEmail(user.new_email);
                    }
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
            if (event === 'USER_UPDATED') {
                console.log("L'utilisateur a mis à jour son email.");
                // Recharger les données utilisateur
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) {
                        setUserData({
                            name: user.user_metadata.name || '',
                            email: user.email || '',
                        });
                        if (user.new_email) {
                            setNewEmail(user.new_email);
                        }
                    }
                });
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);


    const handleSave = useCallback(async () => {
        if (!hasChanges) return;
        // si l'email a changé, on doit vérifier qu'il est valide
        if (email !== userData?.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert("Veuillez entrer un email valide.");
                return;
            }
            // vérifier si l'email est déjà utilisé
            const { data: emailExists, error: fetchError } = await supabase
                .rpc('email_exists', { email_input: email.trim() });

            console.log('Email existe?', emailExists, fetchError);

            if (fetchError) {
                console.error('Erreur:', fetchError);
                alert('Erreur lors de la vérification de l\'email.');
                return;
            }

            if (emailExists) {
                alert('Cette adresse email est déjà utilisée');
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
    }, [hasChanges, email, userData, name]);

    const seeMore = useCallback(() => {
        router.push("/settings/changeEmail");
    }, [router]);

    const sendChangeEmailConfirmation = useCallback(async () => {
        const { data, error } = await supabase.auth.updateUser(
            { email: email },
            { emailRedirectTo: "dun://settings/changeEmail" }
        )
        if (error) {
            console.error("Erreur lors de la mise à jour de l'email : " + error.message);
            return;
        }
        console.log("Un email de confirmation a été envoyé à votre nouvelle adresse email.");
    }, [email]);

    const handleLogout = useCallback(async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Erreur lors de la déconnexion : " + error.message);
                return;
            }
            // Nettoyer le cache des requêtes
            queryClient.clear();
            // Rediriger vers le login
            store.clearStore();
            router.replace("/onboarding/start");
        } catch (error) {
            console.error("Erreur lors de la déconnexion : ", error);
        }
    }, [queryClient, router]);

    const handleDeleteAccount = useCallback(async () => {
        Alert.alert(
            "Supprimer le compte",
            "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et supprimera toutes vos données.",
            [
                {
                    text: "Annuler",
                    onPress: () => console.log("Suppression annulée"),
                    style: "cancel",
                },
                {
                    text: "Supprimer",
                    onPress: async () => {
                        setIsDeletingAccount(true);
                        try {
                            await deleteUserAccount();
                            Alert.alert("Succès", "Votre compte a été supprimé avec succès.", [
                                {
                                    text: "OK",
                                    onPress: () => {
                                        queryClient.clear();
                                        router.replace("/onboarding/start");
                                    },
                                },
                            ]);
                        } catch (error) {
                            console.error("Erreur lors de la suppression du compte:", error);
                            Alert.alert(
                                "Erreur",
                                "Une erreur est survenue lors de la suppression du compte. Veuillez réessayer."
                            );
                        } finally {
                            setIsDeletingAccount(false);
                        }
                    },
                    style: "destructive",
                },
            ]
        );
    }, [queryClient, router]);


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>





            <PopUpContainer
                isVisible={showModal}
                onClose={() => setShowModal(false)}
                children={
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ overflow: 'hidden', height: 400, width: '100%', alignItems: 'center', justifyContent: 'center' }}>

                            {/* PAGE 1 */}
                            <Animated.View style={[{ display: 'flex', gap: 20, alignItems: 'center', width: '90%', height: 400, justifyContent: 'space-around', position: 'absolute' }, page1AnimatedStyle]}>
                                <View
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 20,
                                        width: '100%',
                                    }}
                                >
                                    <Image
                                        source={require('@/assets/images/character/7.png')}
                                        style={{ width: 120, height: 120 }}
                                        resizeMode="contain"
                                    />

                                    <Text
                                        style={{ color: colors.text, fontSize: fontSizes['2xl'], textAlign: 'center' }}
                                    >
                                        Entre ton mot de passe
                                    </Text>

                                    <SimpleInput
                                        placeholder="..."
                                        inputWidth={'100%'}
                                        password
                                        returnKeyType="done"
                                        scale="large"
                                        style={{ textAlign: 'center' }}
                                        value={password}
                                        onChangeText={setPassword}
                                    />

                                </View>

                                <SquircleButton
                                    onPress={!isCheckingPassword ? handleNext1 : undefined}
                                    style={{
                                        width: 100,
                                        height: 48,
                                        backgroundColor: colors.task,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 15,
                                    }}
                                    cornerSmoothing={100}
                                    preserveSmoothing={true}
                                >

                                    <SymbolView
                                        name="arrow.right"
                                        weight="bold"
                                        scale="large"
                                        tintColor={colors.textSecondary}
                                    />

                                </SquircleButton>
                            </Animated.View>

                            {/* PAGE 2 */}
                            <Animated.View style={[{ display: 'flex', gap: 20, alignItems: 'center', width: '90%', height: 400, justifyContent: 'space-around', position: 'absolute' }, page2AnimatedStyle]}>
                                <View
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 20,
                                        width: '100%',
                                    }}
                                >
                                    <View
                                        style={{ position: 'absolute', top: 0, left: 0 }}
                                    >
                                        <SecondaryButton
                                            onPress={handleBack1}
                                            image="chevron.left"
                                        />

                                    </View>
                                    <Image
                                        source={require('@/assets/images/character/8.png')}
                                        style={{ width: 120, height: 120 }}
                                        resizeMode="contain"
                                    />

                                    <Text
                                        style={{ color: colors.text, fontSize: fontSizes['2xl'], textAlign: 'center' }}
                                    >
                                        Entre ton nouvel email
                                    </Text>

                                    <SimpleInput
                                        placeholder="..."
                                        inputWidth={'100%'}
                                        returnKeyType="done"
                                        scale="large"
                                        style={{ textAlign: 'center' }}
                                        value={newEmailInput}
                                        onChangeText={setNewEmailInput}
                                        type="email-address"
                                        cap="none"
                                    />

                                </View>

                                <SquircleButton
                                    onPress={!isCheckingEmail ? handleNext2 : undefined}
                                    style={{
                                        width: 100,
                                        height: 48,
                                        backgroundColor: colors.task,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 15,
                                    }}
                                    cornerSmoothing={100}
                                    preserveSmoothing={true}
                                >

                                    <SymbolView
                                        name="arrow.right"
                                        weight="bold"
                                        scale="large"
                                        tintColor={colors.textSecondary}
                                    />

                                </SquircleButton>
                            </Animated.View>

                            {/* PAGE 3 */}
                            <Animated.View style={[{ display: 'flex', gap: 20, alignItems: 'center', width: '90%', height: 400, justifyContent: 'space-around', position: 'absolute' }, page3AnimatedStyle]}>
                                <View
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 20,
                                        width: '100%',
                                    }}
                                >
                                    <View
                                        style={{ position: 'absolute', top: 0, left: 0 }}
                                    >
                                        <SecondaryButton
                                            onPress={handleBack2}
                                            image="chevron.left"
                                        />
                                    </View>
                                    <Image
                                        source={require('@/assets/images/character/6.png')}
                                        style={{ width: 150, height: 150 }}
                                        resizeMode="contain"
                                    />

                                    <Text
                                        style={{ color: colors.text, fontSize: fontSizes['lg'], textAlign: 'center' }}
                                    >
                                        Un mail de confirmation a été envoyé à{" "}
                                        <Text style={{ fontWeight: 'bold' }}>
                                            ton ancienne et ta nouvelle
                                        </Text>
                                        adresse email.
                                    </Text>
                                    <Text
                                        style={{ color: colors.textSecondary, fontSize: fontSizes.sm, textAlign: 'center' }}
                                    >
                                        Pense à vérifier tes spams si tu ne le vois pas arriver dans les prochaines minutes
                                    </Text>

                                </View>

                                <SquircleButton
                                    onPress={() => setShowModal(false)}
                                    style={{
                                        width: 100,
                                        height: 48,
                                        backgroundColor: colors.text,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 15,
                                    }}
                                    cornerSmoothing={100}
                                    preserveSmoothing={true}
                                >

                                    <SymbolView
                                        name="checkmark"
                                        weight="bold"
                                        scale="large"
                                        tintColor={colors.textSecondary}
                                    />

                                </SquircleButton>
                            </Animated.View>

                        </View>
                    </TouchableWithoutFeedback>
                }
            />

            {/* Modal Mot de passe */}
            <PopUpContainer
                isVisible={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                children={
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ overflow: 'hidden', height: 400, width: '100%', alignItems: 'center', justifyContent: 'center' }}>

                            {/* PAGE 1 */}
                            <Animated.View style={[{ display: 'flex', gap: 20, alignItems: 'center', width: '90%', height: 400, justifyContent: 'space-around', position: 'absolute' }, passPage1AnimatedStyle]}>
                                <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                                    <Image
                                        source={require('@/assets/images/character/7.png')}
                                        style={{ width: 120, height: 120 }}
                                        resizeMode="contain"
                                    />
                                    <Text style={{ color: colors.text, fontSize: fontSizes['2xl'], textAlign: 'center' }}>
                                        Mot de passe actuel
                                    </Text>
                                    <SimpleInput
                                        placeholder="..."
                                        inputWidth={'100%'}
                                        password
                                        returnKeyType="done"
                                        scale="large"
                                        style={{ textAlign: 'center' }}
                                        value={oldPassword}
                                        onChangeText={setOldPassword}
                                    />
                                </View>
                                <SquircleButton
                                    onPress={!isCheckingPassword ? handlePassNext1 : undefined}
                                    style={{ width: 100, height: 48, backgroundColor: colors.task, justifyContent: 'center', alignItems: 'center', borderRadius: 15 }}
                                    cornerSmoothing={100}
                                    preserveSmoothing={true}
                                >
                                    <SymbolView name="arrow.right" weight="bold" scale="large" tintColor={colors.textSecondary} />
                                </SquircleButton>
                            </Animated.View>

                            {/* PAGE 2 */}
                            <Animated.View style={[{ display: 'flex', gap: 20, alignItems: 'center', width: '90%', height: 400, justifyContent: 'space-around', position: 'absolute' }, passPage2AnimatedStyle]}>
                                <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                                    <View style={{ position: 'absolute', top: 0, left: 0 }}>
                                        <SecondaryButton onPress={handlePassBack1} image="chevron.left" />
                                    </View>
                                    <Image
                                        source={require('@/assets/images/character/8.png')}
                                        style={{ width: 120, height: 120 }}
                                        resizeMode="contain"
                                    />
                                    <Text style={{ color: colors.text, fontSize: fontSizes['2xl'], textAlign: 'center' }}>
                                        Nouveau mot de passe
                                    </Text>
                                    <SimpleInput
                                        placeholder="..."
                                        inputWidth={'100%'}
                                        password
                                        returnKeyType="done"
                                        scale="large"
                                        style={{ textAlign: 'center' }}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                </View>
                                <SquircleButton
                                    onPress={!isUpdatingPassword ? handlePassNext2 : undefined}
                                    style={{ width: 100, height: 48, backgroundColor: colors.task, justifyContent: 'center', alignItems: 'center', borderRadius: 15 }}
                                    cornerSmoothing={100}
                                    preserveSmoothing={true}
                                >
                                    <SymbolView name="arrow.right" weight="bold" scale="large" tintColor={colors.textSecondary} />
                                </SquircleButton>
                            </Animated.View>

                            {/* PAGE 3 */}
                            <Animated.View style={[{ display: 'flex', gap: 20, alignItems: 'center', width: '90%', height: 400, justifyContent: 'space-around', position: 'absolute' }, passPage3AnimatedStyle]}>
                                <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                                    <Image
                                        source={require('@/assets/images/character/6.png')}
                                        style={{ width: 150, height: 150 }}
                                        resizeMode="contain"
                                    />
                                    <Text style={{ color: colors.text, fontSize: fontSizes['lg'], textAlign: 'center' }}>
                                        Ton mot de passe a été modifié avec succès.
                                    </Text>
                                </View>
                                <SquircleButton
                                    onPress={() => setShowPasswordModal(false)}
                                    style={{ width: 100, height: 48, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center', borderRadius: 15 }}
                                    cornerSmoothing={100}
                                    preserveSmoothing={true}
                                >
                                    <SymbolView name="checkmark" weight="bold" scale="large" tintColor={colors.textSecondary} />
                                </SquircleButton>
                            </Animated.View>

                        </View>
                    </TouchableWithoutFeedback>
                }
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

                <View
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Text
                        style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                    >
                        INFORMATIONS
                    </Text>
                    <SquircleView>
                        <SettingItem
                            title="Prénom"
                            // placeholder="Votre nom d'utilisateur"
                            rightContent={
                                <SimpleInput
                                    placeholder="..."
                                    value={name}
                                    onChangeText={setName}
                                    inputWidth={150}
                                    style={{ textAlign: "right" }}
                                    isLoading={isLoading}
                                    transparent

                                />
                            }
                        />
                    </SquircleView>
                </View>

                <View
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Text
                        style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                    >
                        ABONNEMENT
                    </Text>
                    <SquircleView>
                        <NavItem title="Gestion de l'abonnement" onPress={() => console.log("Clique sur abonnement")} />
                    </SquircleView>
                </View>

                <View
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Text
                        style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                    >
                        SÉCURITÉ
                    </Text>
                    <SquircleView
                        style={{ display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 16 }}

                    >
                        <NavItem title="Changer le mot de passe" onPress={() => setShowPasswordModal(true)} transparent />
                        <NavItem title="Changer l'email" onPress={() => setShowModal(true)} transparent />
                        {newEmail.length > 0 &&

                            <Squircle
                                entering={FadeInUp.springify()}
                                exiting={FadeOutUp.springify()}
                                style={[styles.alertEmail, { backgroundColor: colors.textSecondary + '20' }]}
                            >
                                <View>
                                    <Text
                                        style={{ color: colors.text + '50', fontFamily: 'Satoshi-Regular' }}
                                    >
                                        Un changement d'email est en cours vers
                                    </Text>
                                    <Text
                                        style={{ color: colors.text+ '90', fontFamily: 'Satoshi-Bold' }}
                                    >
                                        {newEmail}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.alerteEmailButton}
                                    onPress={seeMore}
                                >
                                    <SymbolView
                                        name="chevron.right"
                                        style={styles.symbol}
                                        type="palette"
                                        tintColor={'#00000050'}
                                    />
                                </TouchableOpacity>


                            </Squircle>

                        }
                    </SquircleView>
                </View>

                <View
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Text
                        style={{ color: colors.textSecondary, fontSize: fontSizes.xl }}
                    >
                        ZONE DE DANGER
                    </Text>

                    <SettingItem
                        title="Se déconnecter"
                        onPress={handleLogout}
                        type="danger"
                        image="iphone.and.arrow.forward.outward"
                    />

                    <SquircleView
                        style={{ display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 24 }}
                    >

                        <SettingItem
                            title="Supprimer les données"
                            onPress={!isDeletingAccount ? handleDeleteAccount : undefined}
                            type="danger"
                            image="trash"
                            transparent
                        />

                        <SettingItem
                            title="Supprimer le compte"
                            onPress={!isDeletingAccount ? handleDeleteAccount : undefined}
                            type="danger"
                            image="trash"
                            transparent
                        />
                    </SquircleView>
                </View>


            </ScrollView>
            {/* <View
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

            </View> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    symbol: {
        width: 15,
        height: 15,
        margin: 5,
    },

    alertEmail: {
        borderRadius: 15,
        textAlign: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '90%',
        alignSelf: 'center',
    },

    alerteEmailButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
    },

    scrollContent: {
        marginTop: 20,
        paddingBottom: 100,
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
