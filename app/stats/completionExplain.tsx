import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CompletionExplain() {
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
                        source={require('../../assets/images/stats/completion.png')}
                        style={styles.headerImage}
                    />
                    <Text style={[styles.title, dynamicStyles.text]}>Qu'est ce que le taux de complétude ?</Text>
                </View>
            </View>

            {/* Definition Card */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Définition</Text>
                <Text style={[styles.description, dynamicStyles.textSecondary]}>
                    Le <Text style={[styles.bold, dynamicStyles.text]}>taux de complétude</Text> est le <Text style={[styles.bold, dynamicStyles.text]}>pourcentage moyen de tâches que vous complétez</Text> sur une période donnée. C'est un indicateur de votre capacité à atteindre vos objectifs.
                </Text>
            </View>

            {/* How it's calculated */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Comment est-il calculé ?</Text>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Pour chaque jour, on divise les tâches complétées par le nombre total de tâches
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Formule : <Text style={[styles.bold, dynamicStyles.text]}>(tâches complétées / total des tâches) × 100</Text>
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Une <Text style={[styles.bold, dynamicStyles.text]}>moyenne sur 7 jours</Text> est ensuite calculée
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Le résultat est exprimé en <Text style={[styles.bold, dynamicStyles.text]}>pourcentage</Text>
                    </Text>
                </View>
            </View>

            {/* Interpretation Levels */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Interprétation des Résultats</Text>

                <View style={styles.levelBox}>
                    <View style={[styles.levelDot, { backgroundColor: '#FF4C4C' }]} />
                    <View style={styles.levelContent}>
                        <Text style={[styles.levelTitle, dynamicStyles.text]}>0% - 40%</Text>
                        <Text style={[styles.levelDescription, dynamicStyles.textSecondary]}>
                            Très faible : Vos objectifs sont trop ambitieux ou vous manquez de motivation
                        </Text>
                    </View>
                </View>

                <View style={styles.levelBox}>
                    <View style={[styles.levelDot, { backgroundColor: '#ffcd6fff' }]} />
                    <View style={styles.levelContent}>
                        <Text style={[styles.levelTitle, dynamicStyles.text]}>40% - 70%</Text>
                        <Text style={[styles.levelDescription, dynamicStyles.textSecondary]}>
                            En construction : Vous progressez mais il y a encore de la marge
                        </Text>
                    </View>
                </View>

                <View style={styles.levelBox}>
                    <View style={[styles.levelDot, { backgroundColor: '#74ca77ff' }]} />
                    <View style={styles.levelContent}>
                        <Text style={[styles.levelTitle, dynamicStyles.text]}>70% - 90%</Text>
                        <Text style={[styles.levelDescription, dynamicStyles.textSecondary]}>
                            Très bon : Vous maîtrisez bien vos objectifs
                        </Text>
                    </View>
                </View>

                <View style={styles.levelBox}>
                    <View style={[styles.levelDot, { backgroundColor: '#00CC00' }]} />
                    <View style={styles.levelContent}>
                        <Text style={[styles.levelTitle, dynamicStyles.text]}>90% - 100%</Text>
                        <Text style={[styles.levelDescription, dynamicStyles.textSecondary]}>
                            Excellent : Vous avez atteint vos objectifs quasi systématiquement
                        </Text>
                    </View>
                </View>
            </View>

            {/* What it means */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Ce que cela signifie</Text>

                <View style={styles.meaningBox}>
                    <Text style={[styles.meaningNumber, dynamicStyles.text]}>✅</Text>
                    <View style={styles.meaningContent}>
                        <Text style={[styles.meaningTitle, dynamicStyles.text]}>Taux Élevé (90%+)</Text>
                        <Text style={[styles.meaningDescription, dynamicStyles.textSecondary]}>
                            Vous êtes consistant et fiable. Vos objectifs sont bien calibrés pour votre capacité réelle.
                        </Text>
                    </View>
                </View>

                <View style={styles.meaningBox}>
                    <Text style={[styles.meaningNumber, dynamicStyles.text]}>⚠️</Text>
                    <View style={styles.meaningContent}>
                        <Text style={[styles.meaningTitle, dynamicStyles.text]}>Taux Moyen (50-80%)</Text>
                        <Text style={[styles.meaningDescription, dynamicStyles.textSecondary]}>
                            Vous avez des jours avec et des jours sans. Analysez les obstacles récurrents.
                        </Text>
                    </View>
                </View>

                <View style={styles.meaningBox}>
                    <Text style={[styles.meaningNumber, dynamicStyles.text]}>🔴</Text>
                    <View style={styles.meaningContent}>
                        <Text style={[styles.meaningTitle, dynamicStyles.text]}>Taux Faible (&lt;50%)</Text>
                        <Text style={[styles.meaningDescription, dynamicStyles.textSecondary]}>
                            Vos objectifs sont probablement trop nombreux ou trop complexes. Commencez plus petit.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Example */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Exemple</Text>
                
                <Text style={[styles.exampleSubtitle, dynamicStyles.text]}>Calcul sur 7 jours :</Text>
                <View style={styles.exampleBox}>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Lundi : 4 / 5 tâches = 80%</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Mardi : 3 / 3 tâches = 100%</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Mercredi : 2 / 4 tâches = 50%</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Jeudi : 5 / 5 tâches = 100%</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Vendredi : 3 / 4 tâches = 75%</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Samedi : 2 / 3 tâches = 67%</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.textSecondary]}>Dimanche : 1 / 2 tâches = 50%</Text>
                    <Text style={[styles.exampleResult, dynamicStyles.text]}>
                        → Complétude moyenne = 82%
                    </Text>
                </View>
            </View>

            {/* Tips */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>💡 Conseils pour Progresser</Text>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Commencez petit</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Il vaut mieux compléter 3 petits objectifs que d'en proposer 10 et en échouer 7. Augmentez progressivement.
                    </Text>
                </View>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Soyez réaliste</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Vos objectifs doivent être atteignables selon votre emploi du temps et votre énergie disponible.
                    </Text>
                </View>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Identifiez les blocages</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Si votre taux chute, regardez quelles tâches vous échouez systématiquement et ajustez-les.
                    </Text>
                </View>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Célébrez les succès</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Chaque tâche complétée compte. Un taux de 70% est déjà une bonne performance !
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

    /* Level Boxes */
    levelBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 12,
        alignItems: 'flex-start',
    },

    levelDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginTop: 2,
    },

    levelContent: {
        flex: 1,
        gap: 5,
    },

    levelTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    levelDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    /* Meaning Boxes */
    meaningBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 12,
        alignItems: 'flex-start',
    },

    meaningNumber: {
        fontSize: 28,
        minWidth: 40,
        textAlign: 'center',
    },

    meaningContent: {
        flex: 1,
        gap: 8,
    },

    meaningTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    meaningDescription: {
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
        marginBottom: 80,
    },
});
