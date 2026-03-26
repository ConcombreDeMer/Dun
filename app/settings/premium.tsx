import Squircle from "@/components/Squircle";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useFont } from "../../lib/FontContext";
import { useTheme } from "../../lib/ThemeContext";

export default function Premium() {
    const router = useRouter();
    const { fontSizes } = useFont();
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
    const { colors } = useTheme();

    const renderFeatureItem = (icon: string, textElements: React.ReactNode) => (
        <View style={styles.featureItem}>
            <SymbolView name={icon as any} weight="semibold" size={36} tintColor="#333" style={styles.featureIcon} />
            <Text style={[styles.featureText, { fontSize: fontSizes.base }]}>
                {textElements}
            </Text>
        </View>
    );


    const buyPremium = () => {
        console.log('Buy for ', selectedPlan);
    };



    return (
        <View style={styles.safeArea}>


            <LinearGradient
                colors={['#FFF2D1', '#FFE39C']}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '120%',
                    zIndex: -1,
                }}
            />

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <SymbolView name="chevron.left" weight="medium" size={20} tintColor="#A09989" />
            </TouchableOpacity>
            <View
                style={styles.scrollContainer}
            >

                <View style={styles.header}>
                    <Text style={[styles.title, { fontSize: fontSizes['7xl'] }]}>
                        Dun<Text style={styles.titlePlus}>+</Text>
                    </Text>
                </View>

                <View style={styles.characterContainer}>
                    <Image
                        source={require('../../assets/images/character/16.png')}
                        style={styles.characterImage}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.featuresCardContainer}>
                    <Squircle style={styles.featuresCard}>
                        {renderFeatureItem('infinity', <Text>Nombre de tâches par jour <Text style={styles.boldText}>illimité</Text></Text>)}
                        {renderFeatureItem('chart.line.uptrend.xyaxis', <Text>Accès à des <Text style={styles.boldText}>statistiques poussés</Text> pour un meilleur suivie</Text>)}
                        {renderFeatureItem('paintbrush', <Text><Text style={styles.boldText}>Personnalise</Text> l'app à ton image{"\n"}(thème, disposition, son, etc...)</Text>)}
                    </Squircle>

                    <Squircle style={styles.futureFeaturesContainer}>
                        <Text style={[styles.futureFeaturesText, { fontSize: fontSizes.sm }]}>
                            + des fonctionnalités <Text style={styles.boldText}>futures</Text>
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowDetailsModal(true)}
                        >
                            <Text style={[styles.learnMoreText, { fontSize: fontSizes.sm }]}>en savoir plus...</Text>
                        </TouchableOpacity>
                    </Squircle>
                </View>

                <View style={styles.plansContainer}>
                    <SquircleButton
                        style={[styles.planCard, selectedPlan === 'annual' && styles.planCardActive]}
                        onPress={() => setSelectedPlan('annual')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.planHeader}>
                            <Text style={[styles.planTitle, { fontSize: fontSizes.lg }]}>Annuel</Text>
                            <View style={[styles.radioCircle, selectedPlan === 'annual' && styles.radioCircleActive]}>
                                {selectedPlan === 'annual' && <View style={styles.radioInnerCircle} />}
                            </View>
                        </View>
                        <Text style={[styles.planPrice, { fontSize: fontSizes['2xl'] }]}>12,99 €</Text>
                        <Text style={[styles.planDiscount, { fontSize: fontSizes.sm }]}>soit 1.33 € / mois (-25%)</Text>
                    </SquircleButton>

                    <SquircleButton
                        style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
                        onPress={() => setSelectedPlan('monthly')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.planHeader}>
                            <Text style={[styles.planTitle, { fontSize: fontSizes.lg }]}>Mensuel</Text>
                            <View style={[styles.radioCircle, selectedPlan === 'monthly' && styles.radioCircleActive]}>
                                {selectedPlan === 'monthly' && <View style={styles.radioInnerCircle} />}
                            </View>
                        </View>
                        <Text style={[styles.planPrice, { fontSize: fontSizes['2xl'] }]}>1,99 €</Text>
                    </SquircleButton>
                </View>

                <SquircleButton 
                    style={styles.buyButton}
                    onPress={buyPremium}
                >
                    <Text style={[styles.buyButtonText, { fontSize: fontSizes['2xl'] }]}>
                        Obtenir Dun <Text style={styles.buyButtonPlus}>+</Text>
                    </Text>
                </SquircleButton>
            </View>



            {/* <PopUpContainer
                isVisible={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                children={
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ overflow: 'hidden', height: 400, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', paddingHorizontal: 20 }}>
                                <SymbolView name="exclamationmark.triangle.fill" weight="semibold" size={120} tintColor="#000000" />
                                <Text style={{ fontFamily: 'Satoshi-Regular', color: colors.text, fontSize: fontSizes['xl'], textAlign: 'center' }}>
                                    Vous êtes sur le point de résilier votre abonnement à <Text style={{ fontFamily: 'Satoshi-Bold' }}>Dun +</Text>.
                                </Text>

                                <Text
                                    style={{ fontFamily: 'Satoshi-Regular', color: colors.textSecondary, fontSize: fontSizes.lg, textAlign: 'center' }}
                                >
                                    En cas de confirmation, celui ci prendra fin le <Text style={{ fontFamily: 'Satoshi-Bold' }}> date</Text>, les services premium ne vous seront plus accessibles passé cette date.
                                </Text>

                            </View>

                            <PrimaryButton
                                title="Confirmer"
                                onPress={() => setShowDetailsModal(false)}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                }
            /> */}

        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        paddingTop: 70,
        paddingBottom: 40
    },
    scrollContainer: {
        paddingHorizontal: 24,
        height: '100%',
    },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3E8C5',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        position: 'absolute',
        top: 70,
        left: 20,
    },
    header: {
        alignItems: 'center',
    },
    title: {
        fontFamily: 'Satoshi-Black',
        color: '#000',
        letterSpacing: -1,
    },
    titlePlus: {
        color: '#F4BA00',
    },
    characterContainer: {
        alignItems: 'center',
        zIndex: 10,
    },
    characterImage: {
        width: 200,
        height: 200,
    },
    featuresCardContainer: {
        alignItems: 'center',
        marginTop: -20,
        zIndex: 11,
    },
    featuresCard: {
        backgroundColor: '#ffffff4d',
        borderRadius: 28,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
        shadowColor: "#E2CF91",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F8F1DB',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    featureIcon: {
        marginRight: 16,
    },
    featureText: {
        fontFamily: 'Satoshi-Regular',
        color: '#7D7661',
        flex: 1,
        lineHeight: 20,
    },
    boldText: {
        fontFamily: 'Satoshi-Bold',
        color: '#554E3A',
    },
    futureFeaturesContainer: {
        backgroundColor: '#ffffff4d',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F8F1DB',
        shadowColor: "#E2CF91",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
        marginTop: 10,
    },
    futureFeaturesText: {
        fontFamily: 'Satoshi-Regular',
        color: '#8D8775',
    },
    learnMoreText: {
        fontFamily: 'Satoshi-Medium',
        color: '#8D8775',
        textDecorationLine: 'underline',
        marginTop: 2,
    },
    plansContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
        marginTop: 20,
    },
    planCard: {
        flex: 1,
        backgroundColor: '#FCF3D2',
        borderRadius: 24,
        padding: 16,
        paddingBottom: 20,
        borderWidth: 2,
        borderColor: '#F8F1DB',
    },
    planCardActive: {
        borderColor: '#E2CF91',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    planTitle: {
        fontFamily: 'Satoshi-Bold',
        color: '#554E3A',
    },
    radioCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D1CAAF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleActive: {
        backgroundColor: '#E2CF91',
    },
    radioInnerCircle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#554E3A',
    },
    planPrice: {
        fontFamily: 'Satoshi-Black',
        color: '#000',
        marginBottom: 4,
    },
    planDiscount: {
        fontFamily: 'Satoshi-Medium',
        color: '#8D8775',
    },
    buyButton: {
        backgroundColor: '#272727',
        borderRadius: 17,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        height: 64,
        width: '80%',
        alignSelf: 'center',
        position: 'absolute',
        bottom: 0,
    },
    buyButtonText: {
        fontFamily: 'Satoshi-Bold',
        color: '#FFF',
    },
    buyButtonPlus: {
        color: '#F4BA00',
    },
});