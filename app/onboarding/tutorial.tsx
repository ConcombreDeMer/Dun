import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SquircleButton, SquircleView } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, InputAccessoryView, Keyboard, Text, TextInput, View } from "react-native";
import { useTheme } from "../../lib/ThemeContext";


export default function Tutorial() {
    const { colors } = useTheme();
    const router = useRouter();
    const simpleInputRef = useRef<TextInput>(null);
    const [disableNext, setDisableNext] = useState(false);
    const [name, setName] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const AnimatedSquircle = Animated.createAnimatedComponent(SquircleView);
    const animatedOpacity = useRef(new Animated.Value(0)).current;
    const animatedPosition = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        animatedOpacity.setValue(0);
        animatedPosition.setValue(50);

        Animated.parallel([
            Animated.timing(animatedOpacity, {
                toValue: 1,
                duration: 600,
                delay: currentPage === 0 ? 500 : 0,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(animatedPosition, {
                toValue: 0,
                duration: 600,
                delay: currentPage === 0 ? 500 : 0,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [currentPage, animatedOpacity, animatedPosition]);

    const handleNext = async () => {
        if (currentPage === 3) {
            if (name.trim() === '') {
                Alert.alert("Oups !", "Il semble que tu n'aies pas entré de prénom. Dis nous comment tu t'appelles pour continuer !");
                return;
            }
        }
        if (currentPage === pages.length - 1) {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const { error } = await supabase
                        .from('Profiles')
                        .update({ hasName: true, name: name })
                        .eq('id', user.id);

                    if (error) {
                        console.error('Erreur lors de la sauvegarde du name dans Supabase:', error);
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du name:', error);
            }

            if (name && name.trim() !== '') {
                const { data, error } = await supabase.auth.updateUser(
                    { data: { name: name } }
                )
                if (error) {
                    console.error("Erreur lors de la mise à jour du nom d'utilisateur : " + error.message);
                    return;
                }
                console.log("Nom d'utilisateur mis à jour avec succès.");
            }

            router.push('/');
        } else {
            setCurrentPage(currentPage + 1);
            animatedOpacity.setValue(0);
        }
    };

    const handlePrevious = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
            animatedOpacity.setValue(0);
        }
    };


    const animatedBull = {
        opacity: animatedOpacity,
        transform: [
            {
                translateY: animatedPosition,
            },
        ],
    };

    const submitName = () => {
        if (name.trim() === '') {
            Alert.alert("Oups !", "Il semble que tu n'aies pas entré de prénom. Peux-tu nous dire comment tu t'appelles ?")
            return;
        }
        Keyboard.dismiss();
        setCurrentPage(4);
    }


    const pages = [
        {
            page: '0',
            text: '',
            image: require('../../assets/images/character/10.png'),
        },
        {
            page: '1',
            text: "J'vais t'expliquer comment utiliser l'app que tu viens de télécharger !",
            image: require('../../assets/images/character/10.png'),
        },
        {
            page: '2',
            text: "Mais avant toute chose...",
            image: require('../../assets/images/character/10.png'),
        },
        {
            page: '3',
            text: "Comment t'appelles-tu ?",
            image: require('../../assets/images/character/11.png'),
        },
        {
            page: '4',
            text: "Enchanté ",
            image: require('../../assets/images/character/2.png'),
        },
        {
            page: '5',
            text: "Maintenant que les présentations sont faites...",
            image: require('../../assets/images/character/12.png'),
        },
        {
            page: '6',
            text: "Allons voir cette app !",
            image: require('../../assets/images/character/13.png'),
        },
    ];

    return (

        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <LinearGradient
                // Background Linear Gradient
                colors={['#FFFFFF', '#EEEEEE']}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 0,
                }}
            />

            <View
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                    marginBottom: 100,
                }}
            >

                <AnimatedSquircle
                    style={[{
                        backgroundColor: '#EDEDED',
                        borderRadius: 20,
                        marginRight: 100,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingVertical: 15,
                        position: 'absolute',
                        bottom: 270,
                    },
                        animatedBull
                    ]}
                    cornerSmoothing={100}
                    preserveSmoothing={true}
                >
                    {
                        currentPage === 0 && (
                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 16,
                                    fontFamily: 'Satoshi-Regular',
                                }}
                            >
                                Salut !{"\n"}Moi c'est <Text style={{ fontFamily: 'Satoshi-Bold' }}>Dun</Text> !{"\n"}Ravis de te rencontrer !
                            </Text>
                        )
                    }

                    {
                        currentPage > 0 && (
                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 16,
                                    fontFamily: 'Satoshi-Regular',
                                }}
                            >
                                {pages[currentPage].text}
                            </Text>
                        )
                    }

                    {
                        currentPage === 4 && (
                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 16,
                                    fontFamily: 'Satoshi-Regular',
                                }}
                            >
                                <Text style={{ fontFamily: 'Satoshi-Bold' }}>{name} !</Text>
                            </Text>
                        )
                    }


                </AnimatedSquircle>

                <View
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}

                >

                    <Image
                        source={pages[currentPage].image}
                        style={{ width: 200, height: 200 }}
                        contentFit="contain"
                    />

                    <Image
                        source={require('../../assets/images/character/0.png')}
                        style={{ width: 200, height: 50 }}
                        contentFit="contain"
                    />

                </View>

            </View>


            {
                currentPage === 3 && (


                    <View
                        style={{
                            position: 'absolute',
                            bottom: 250,
                            width: '80%',
                        }}
                    >

                        <TextInput
                            placeholder="Écris ton prénom ici..."
                            value={name}
                            onChangeText={setName}
                            style={{
                                backgroundColor: "white",
                                borderRadius: 10,
                                paddingHorizontal: 15,
                                paddingVertical: 10,
                                color: colors.text,
                                height: 64,
                                fontSize: 20,
                                textAlign: 'center',
                                fontFamily: 'Satoshi-Medium',
                                boxShadow: `0px 10px 15px 0px #00000025`,
                                borderWidth: 0.5,
                                borderColor: '#e0e0e0',
                            }}
                            inputAccessoryViewID="nameInput"
                            enterKeyHint="done"
                            onFocus={() => {
                                setTimeout(() => simpleInputRef.current?.focus(), 0);
                            }}
                        />

                        <InputAccessoryView
                            nativeID="nameInput"
                        >
                            <TextInput
                                ref={simpleInputRef}
                                placeholder="Écris ton prénom ici..."
                                value={name}
                                onChangeText={setName}
                                enterKeyHint="done"
                                onSubmitEditing={() => {
                                    submitName();
                                }}
                                style={{
                                    backgroundColor: "white",
                                    borderRadius: 10,
                                    paddingHorizontal: 15,
                                    paddingVertical: 10,
                                    color: colors.text,
                                    height: 64,
                                    marginBottom: 5,
                                    width: '80%',
                                    alignSelf: 'center',
                                    fontSize: 20,
                                    textAlign: 'center',
                                    fontFamily: 'Satoshi-Medium',
                                    boxShadow: `0px 10px 15px 0px #00000025`,
                                    borderWidth: 0.5,
                                    borderColor: '#e0e0e0',
                                }}
                            />
                        </InputAccessoryView>
                    </View>


                )
            }


            <View
                style={{
                    position: 'absolute',
                    bottom: 50,
                    flexDirection: 'row',
                    gap: 20,
                }}
            >
                {
                    currentPage != 0 && (

                        <SquircleButton
                            onPress={handlePrevious}
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
                                name="arrow.left"
                                weight="bold"
                                scale="large"
                                tintColor={colors.textSecondary}
                            />
                        </SquircleButton>
                    )
                }
                <SquircleButton
                    onPress={handleNext}
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

            </View>


        </View>

    );

}