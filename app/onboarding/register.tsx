import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
  FadeOutDown,
  FadeInDown,
} from 'react-native-reanimated';
import { getImageSource } from '@/lib/imageHelper';
import { Image } from "react-native";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import AsyncStorage from '@react-native-async-storage/async-storage';
import SimpleInput from '@/components/textInput';
import PrimaryButton from '@/components/primaryButton';


export default function Register() {

  const LottieView = require("lottie-react-native").default;
  const router = useRouter();
  const { colors, theme } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(0);
  const styles = createStyles(colors);

  const inputAnimationTitle = FadeInUp.springify().delay(500).duration(1500);
  const inputAnimation = FadeInUp.springify().delay(800).duration(1500);
  const inputAnimationNoDelay = FadeInUp.springify().duration(1500);



  useEffect(() => {
    setPage(1);
  }, []);


  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      // Créer le compte avec Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: username.trim(),
          },
          emailRedirectTo: Linking.createURL('/onboarding/successMail'),
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Créer ou mettre à jour le profil utilisateur dans la table Profiles
        const { error: profileError } = await supabase
          .from('Profiles')
          .upsert({
            id: authData.user.id,
            name: username.trim(),
            email: email.trim(),
          });

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError);
        }

        // Si email_confirmed_at existe, l'utilisateur est confirmé
        // Sinon, il doit confirmer son email
        if (authData.user.email_confirmed_at) {
          router.replace('/');
        } else {
          // Email de vérification envoyé - Navigation vers la page de vérification
          setLoading(false);
          router.push({
            pathname: '/onboarding/emailVerif',
            params: { email: email.trim() }
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription. Veuillez réessayer.');
      setLoading(false);
    }
  };

  const handleAnimatePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorMessage('');

    // Validation pour chaque page
    if (page === 1) {
      if (!username.trim()) {
        setErrorMessage('Veuillez entrer votre prénom');
        return;
      }
    }

    if (page === 2) {
      if (!email.trim()) {
        setErrorMessage('Veuillez entrer votre email');
        return;
      }
      if (!isValidEmail(email.trim())) {
        setErrorMessage('Veuillez entrer une adresse email valide');
        return;
      }
    }

    if (page === 3) {
      if (!password.trim()) {
        setErrorMessage('Veuillez entrer un mot de passe');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
    }

    if (page === 4) {
      if (!confirmPassword.trim()) {
        setErrorMessage('Veuillez confirmer votre mot de passe');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Les mots de passe ne correspondent pas');
        return;
      }
    }

    if (page < 6) {
      setPage(page + 1);
    }
  }

  const handleBackPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (page == 1) {
      router.back();
    } else {
      setPage(page - 1);
    }
  }

  const handleStartPress = () => {
    router.back();
  }

  const getTextInputStyle = () => [
    styles.textInput,
    {
      backgroundColor: colors.input,
      borderColor: colors.border,
      color: colors.text,
    }
  ];


  return (

    <Pressable
      style={styles.content}
      onPress={() => Keyboard.dismiss()}
    >
      <View style={{ flex: 1, width: '100%', height: '100%' }}>

        {/* ----------------------- HEADER ---------------------------- */}

        <Animated.View
          entering={FadeIn.springify().delay(1500).duration(1500)}
          exiting={FadeOut.springify()}
          style={styles.headerContainer}
        >
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartPress}
          >
            <Image
              style={{ width: 24, height: 24 }}
              source={require('../../assets/images/dark/cancel.png')}
            >
            </Image>
          </TouchableOpacity>

          <View style={styles.dotsContainer}>
            {[1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === page ? colors.actionButton : colors.border,
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>



        {/* ----------------------- FORMULAIRE ---------------------------- */}

        {page == 1 && (
          <View style={styles.formContainer}>
            <Animated.View
              entering={inputAnimationTitle}
              exiting={FadeOutDown.springify()}
            >
              <Text style={styles.label}>Quel est ton <Text style={{ fontWeight: 'bold' }}>prénom</Text> ?</Text>
            </Animated.View>

            <Animated.View
              entering={inputAnimation}
              exiting={FadeOutDown.springify()}
              style={styles.inputContainer}
            >
              <SimpleInput
                placeholder="..."
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                center
                scale="large"
              />
              {errorMessage ? (
                <Animated.Text
                  entering={FadeInUp.springify()}
                  exiting={FadeOut.springify()}
                  style={[styles.errorText, { color: colors.danger }]}
                >
                  {errorMessage}
                </Animated.Text>
              ) : null}
            </Animated.View>

          </View>
        )}

        {page == 2 && (
          <View style={styles.formContainer}>
            <Animated.View
              entering={inputAnimationTitle}
              exiting={FadeOutDown.springify()}
            >
              <Text style={styles.label}>Quelle est ton adresse <Text style={{ fontWeight: 'bold' }}>e-mail</Text> ?</Text>
            </Animated.View>

            <Animated.View
              entering={inputAnimation}
              exiting={FadeOutDown.springify()}
              style={styles.inputContainer}
            >
              <SimpleInput
                placeholder="..."
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                center
                scale="large"
              />
              {errorMessage ? (
                <Animated.Text
                  entering={FadeInUp.springify()}
                  exiting={FadeOut.springify()}
                  style={[styles.errorText, { color: colors.danger }]}
                >
                  {errorMessage}
                </Animated.Text>
              ) : null}
            </Animated.View>
          </View>
        )}

        {(page == 3 || page == 4) && (
          <View style={styles.formContainer}>
            <Animated.View
              entering={inputAnimationTitle}
              exiting={FadeOutDown.springify()}
            >
              <Text style={styles.label}>Crée un <Text style={{ fontWeight: 'bold' }}>mot de passe</Text></Text>
            </Animated.View>

            <Animated.View
              entering={inputAnimation}
              exiting={FadeOutDown.springify()}
              style={styles.inputContainer}
            >
              <SimpleInput
                placeholder="..."
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                center
                scale="large"
                password
              />
              {errorMessage && page === 3 ? (
                <Animated.Text
                  entering={FadeInUp.springify()}
                  exiting={FadeOut.springify()}
                  style={[styles.errorText, { color: colors.danger }]}
                >
                  {errorMessage}
                </Animated.Text>
              ) : null}
            </Animated.View>
            {page == 4 && (
              <Animated.View
                entering={inputAnimationNoDelay}
                exiting={FadeOutDown.springify()}
                style={styles.inputContainer}
              >
                <SimpleInput
                  placeholder="Confirme ton mot de passe"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  center
                  scale="large"
                  password
                />
                {errorMessage ? (
                  <Animated.Text
                    entering={FadeInUp.springify()}
                    exiting={FadeOut.springify()}
                    style={[styles.errorText, { color: colors.danger }]}
                  >
                    {errorMessage}
                  </Animated.Text>
                ) : null}
              </Animated.View>
            )}
          </View>
        )}

        {page === 5 && (
          <Animated.View
            style={styles.animationContainer}
            entering={inputAnimation}
            exiting={FadeOut.springify()}
          >
            <Image
              source={getImageSource('success', theme)}
              style={{ width: 100, height: 100 }}
            />
            <Text
              style={{ marginTop: 20, fontSize: 24, fontWeight: '500', color: colors.text }}
            >
              C'est tout ce qu'il nous faut 🙌
            </Text>
            <Text
              style={{ marginTop: 20, fontSize: 20, fontWeight: '300', color: colors.text }}
            >
              Ton profil est prêt à être créer.
            </Text>
          </Animated.View>
        )}


        {/* --------------------- FOOTER ------------------------- */}


        <Animated.View
          style={styles.buttonSection2}
          entering={FadeInUp.springify().delay(1500).duration(1000)}
          exiting={FadeOutDown.springify().delay(100).duration(1500)}
        >

          <PrimaryButton
            image='back'
            onPress={handleBackPress}
            size='small'
          />

          {page < 5 && (
            <PrimaryButton
              title="Valider"
              onPress={handleAnimatePress}
              size='mid'
            />
          )}

          {page === 5 && (
            // <TouchableOpacity
            //   style={[styles.validateButton, { backgroundColor: colors.actionButton }]}
            //   onPress={handleSignUp}
            //   disabled={loading}
            // >
            //   {loading ? (
            //     <ActivityIndicator color={colors.buttonText} />
            //   ) : (
            //     <Text style={[styles.validateButtonText, { color: colors.buttonText }]}>
            //       Créer le profil
            //     </Text>
            //   )}
            // </TouchableOpacity>

            <PrimaryButton
              title={loading ? "" : "Créer le profil"}
              onPress={handleSignUp}
              size='mid'
              disabled={loading}
            />
          )}

        </Animated.View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: 23,
      paddingVertical: 23,
      backgroundColor: colors.background,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      width: '80%',
      height: 60,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
      zIndex: 1,
    },
    buttonSection: {
      marginBottom: 30,
      zIndex: 2,
      position: 'absolute',
      bottom: 50,
      width: '90%',
      alignSelf: 'center',
      display: 'flex',
      flexDirection: 'column',
    },
    pin: {
      alignSelf: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      position: 'absolute',
      top: -10,
      right: 0,
      zIndex: 2,
      backgroundColor: colors.input,
      borderColor: colors.border,
      borderWidth: 1,

    },
    primaryButton: {
      paddingVertical: 16,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderColor: colors.actionButton,
      borderWidth: 1.5
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      paddingVertical: 16,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonSection2: {
      zIndex: 2,
      position: 'absolute',
      bottom: 0,
      width: '100%',
      alignSelf: 'center',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    validateButton: {
      height: 70,
      width: '77%',
      borderRadius: 100,
      position: "relative",
      left: 0,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: 'flex-end',
    },
    validateButtonText: {
      fontSize: 20,
      fontWeight: "600",
      fontFamily: "Satoshi-Bold",
    },
    footerInfo: {
      fontSize: 12,
      textAlign: 'center',
      width: '100%',
      marginTop: 20,
    },
    animationContainer: {
      height: '100%',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 0,
      position: 'absolute',
    },

    lottieAnimation: {
      width: '100%',
      height: '100%',
    },
    label: {
      fontSize: 22,
      fontWeight: '300',
    },
    backButton: {
      height: 70,
      width: 70,
      backgroundColor: colors.actionButton,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      display: 'flex',
    },
    backButtonText: {
      fontSize: 18,
    },
    formContainer: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      transform: [{ translateY: -100 }],
      alignItems: 'center',
      zIndex: 1,
    },
    inputContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 10,
    },
    startButton: {
      height: 30,
      width: 30,
      borderRadius: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    headerContainer: {
      position: 'absolute',
      width: '100%',
      top: 70,
      alignSelf: 'center',
      zIndex: 3,
      alignItems: 'center',
      justifyContent: 'space-between',
      display: 'flex',
      flexDirection: 'row',
    },
    dotsContainer: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    errorText: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 8,
      textAlign: 'center',
      zIndex: 0,
    },
  });
