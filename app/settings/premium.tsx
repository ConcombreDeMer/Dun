import Squircle from "@/components/Squircle";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SquircleButton } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import {
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useFont } from "../../lib/FontContext";

export default function Premium() {
    const router = useRouter();
    const { fontSizes } = useFont();

    const renderFeatureItem = (icon: string, textElements: React.ReactNode) => (
        <View style={styles.featureItem}>
            <SymbolView name={icon as any} weight="semibold" size={36} tintColor="#333" style={styles.featureIcon} />
            <Text style={[styles.featureText, { fontSize: fontSizes.base }]}>
                {textElements}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>


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
                        <TouchableOpacity>
                            <Text style={[styles.learnMoreText, { fontSize: fontSizes.sm }]}>en savoir plus...</Text>
                        </TouchableOpacity>
                    </Squircle>
                </View>

                <View style={styles.pricingContainer}>
                    <Text style={[styles.pricingSubtitle, { fontSize: fontSizes.sm }]}>Pour le prix d'un café par mois</Text>
                    <Text style={[styles.pricingTitle, { fontSize: fontSizes['2xl'] }]}>2,99€/mois</Text>
                </View>

                <SquircleButton style={styles.buyButton}>
                    <Text style={[styles.buyButtonText, { fontSize: fontSizes['2xl'] }]}>
                        Obtenir Dun <Text style={styles.buyButtonPlus}>+</Text>
                    </Text>
                </SquircleButton>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FCF3D2',
    },
    scrollContainer: {
        paddingHorizontal: 24,
        // paddingBottom: 40,
        marginTop: 20,
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
        marginBottom: 10,
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
        height: 200,
        marginBottom: 20,
        zIndex: 10,
    },
    characterImage: {
        width: 250,
        height: 250,
    },
    featuresCardContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    featuresCard: {
        backgroundColor: '#ffffff4d',
        borderRadius: 28,
        paddingVertical: 20,
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
        marginBottom: 24,
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
        zIndex: -1,
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
    pricingContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    pricingSubtitle: {
        fontFamily: 'Satoshi-Regular',
        color: '#A09989',
        marginBottom: 4,
    },
    pricingTitle: {
        fontFamily: 'Satoshi-Bold',
        color: '#655D49',
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
        bottom: 40,
    },
    buyButtonText: {
        fontFamily: 'Satoshi-Bold',
        color: '#FFF',
    },
    buyButtonPlus: {
        color: '#F4BA00',
    },
});