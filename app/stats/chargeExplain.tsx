import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ChargeExplain() {
    const router = useRouter();
    const { colors } = useTheme();

    const dynamicStyles = {
        container: {
            backgroundColor: colors.background,
        },
        header: {
            backgroundColor: colors.background,
        },
        card: {
            backgroundColor: colors.card,
            borderColor: colors.border,
        },
        text: {
            color: colors.text,
        },
        textSecondary: {
            color: colors.textSecondary,
        },
        bullet: {
            borderColor: colors.border,
        },
    };

    return (
        <ScrollView style={[styles.container, dynamicStyles.container]}>
            {/* Header */}
            <View style={[styles.header, dynamicStyles.header]}>
                <View
                    style={styles.handler}
                ></View>
                
                <View style={styles.headerContent}>
                    <Image
                        source={require('../../assets/images/stats/charge.png')}
                        style={styles.headerImage}
                    />
                    <Text style={[styles.title, dynamicStyles.text]}>Qu'est-ce que la Charge ?</Text>
                </View>
            </View>

            {/* Definition Card */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Définition</Text>
                <Text style={[styles.description, dynamicStyles.textSecondary]}>
                    La <Text style={[styles.bold, dynamicStyles.text]}>charge</Text> est une mesure quantitative de votre <Text style={[styles.bold, dynamicStyles.text]}>volume de travail quotidien moyen</Text>. Elle représente la complexité et l'ampleur de vos objectifs sur une période donnée.
                </Text>
            </View>

            {/* How it's calculated */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Comment est-elle calculée ?</Text>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Chaque tâche contribue à votre charge quotidienne
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Un calcul de <Text style={[styles.bold, dynamicStyles.text]}>moyenne sur 7 jours</Text> est effectué
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Seuls les <Text style={[styles.bold, dynamicStyles.text]}>jours passés</Text> sont pris en compte (pas le jour courant)
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        La charge est exprimée en <Text style={[styles.bold, dynamicStyles.text]}>nombre moyen de tâches</Text>
                    </Text>
                </View>
            </View>

            {/* Charge Levels */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Niveaux de Charge</Text>

                <View style={styles.chargeBox}>
                    <View style={[styles.chargeDot, { backgroundColor: '#FF4C4C' }]} />
                    <View style={styles.chargeContent}>
                        <Text style={[styles.chargeLevel, dynamicStyles.text]}>Charge Faible</Text>
                        <Text style={[styles.chargeDescription, dynamicStyles.textSecondary]}>
                            Moins de 2 tâches en moyenne
                        </Text>
                    </View>
                </View>

                <View style={styles.chargeBox}>
                    <View style={[styles.chargeDot, { backgroundColor: '#ffcd6fff' }]} />
                    <View style={styles.chargeContent}>
                        <Text style={[styles.chargeLevel, dynamicStyles.text]}>Charge Modérée</Text>
                        <Text style={[styles.chargeDescription, dynamicStyles.textSecondary]}>
                            Entre 2 et 4 tâches en moyenne
                        </Text>
                    </View>
                </View>

                <View style={styles.chargeBox}>
                    <View style={[styles.chargeDot, { backgroundColor: '#74ca77ff' }]} />
                    <View style={styles.chargeContent}>
                        <Text style={[styles.chargeLevel, dynamicStyles.text]}>Charge Saine</Text>
                        <Text style={[styles.chargeDescription, dynamicStyles.textSecondary]}>
                            Plus de 4 tâches et jusqu'à 7
                        </Text>
                    </View>
                </View>
            </View>

            {/* Interpretation */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Interprétation</Text>

                <View style={styles.interpretBox}>
                    <Text style={[styles.interpretNumber, dynamicStyles.text]}>📊</Text>
                    <View style={styles.interpretContent}>
                        <Text style={[styles.interpretTitle, dynamicStyles.text]}>Comprendre votre charge</Text>
                        <Text style={[styles.interpretDescription, dynamicStyles.textSecondary]}>
                            La charge vous aide à évaluer si votre charge de travail est équilibrée. Une charge trop faible peut indiquer un manque de motivation, tandis qu'une charge très élevée peut mener au surmenage.
                        </Text>
                    </View>
                </View>

                <View style={styles.interpretBox}>
                    <Text style={[styles.interpretNumber, dynamicStyles.text]}>⚖️</Text>
                    <View style={styles.interpretContent}>
                        <Text style={[styles.interpretTitle, dynamicStyles.text]}>Chercher l'équilibre</Text>
                        <Text style={[styles.interpretDescription, dynamicStyles.textSecondary]}>
                            L'idéal est de maintenir une charge modérée à saine pour rester productif sans vous épuiser.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Example */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Exemple</Text>
                
                <Text style={[styles.exampleSubtitle, dynamicStyles.text]}>7 derniers jours :</Text>
                <View style={styles.exampleBox}>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Lundi : 2 tâches</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Mardi : 3 tâches</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Mercredi : 2 tâches</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Jeudi : 4 tâches</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Vendredi : 3 tâches</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Samedi : 5 tâches</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Dimanche : 2 tâches</Text>
                    <Text style={[styles.exampleResult, dynamicStyles.text]}>
                        → Charge moyenne = 3.1 tâches
                    </Text>
                </View>
            </View>

            {/* Tips */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>💡 Conseils</Text>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Ajustez vos objectifs</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Si votre charge est trop basse, augmentez légèrement vos objectifs. Si elle est trop haute, réduisez-les progressivement.
                    </Text>
                </View>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Observez les tendances</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Suivez votre charge au fil du temps pour identifier les patterns et adapter votre stratégie.
                    </Text>
                </View>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Restez cohérent</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Une charge stable et réaliste est plus efficace qu'une alternance entre surcharge et sous-charge.
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 40,
    },

    /* Header Styles */
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: 'center',
        marginBottom: 20,
    },

    handler: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        position: 'absolute',
        top: 10,
    },

    headerContent: {
        alignItems: 'center',
        gap: 15,
        marginTop: 20,
    },

    headerImage: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
    },

    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
    },

    /* Card Styles */
    card: {
        marginHorizontal: 15,
        marginBottom: 15,
        padding: 20,
        borderRadius: 25,
        borderWidth: 0.5,
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 15,
        marginTop: 5,
    },

    /* Description Styles */
    description: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '400',
    },

    bold: {
        fontWeight: '700',
    },

    /* Bullet Points */
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },

    bulletDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 8,
        borderWidth: 1.5,
    },

    bulletText: {
        fontSize: 14,
        lineHeight: 22,
        flex: 1,
        fontWeight: '400',
    },

    /* Charge Boxes */
    chargeBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 12,
        alignItems: 'flex-start',
    },

    chargeDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginTop: 2,
    },

    chargeContent: {
        flex: 1,
        gap: 5,
    },

    chargeLevel: {
        fontSize: 15,
        fontWeight: '600',
    },

    chargeDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    /* Interpretation Boxes */
    interpretBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 12,
        alignItems: 'flex-start',
    },

    interpretNumber: {
        fontSize: 28,
        minWidth: 40,
        textAlign: 'center',
    },

    interpretContent: {
        flex: 1,
        gap: 8,
    },

    interpretTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    interpretDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    /* Example Boxes */
    exampleSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
    },

    exampleBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        gap: 6,
    },

    exampleLabel: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
    },

    exampleResult: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 5,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
    },

    /* Tip Boxes */
    tipBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FFB84D',
    },

    tipTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    tipDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    /* Footer */
    footer: {
        height: 20,
    },
});