import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StreakExplain() {
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
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={[styles.backText, dynamicStyles.text]}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../../assets/images/stats/streak/high.png')}
                        style={styles.headerImage}
                    />
                    <Text style={[styles.title, dynamicStyles.text]}>Qu'est-ce qu'un Streak ?</Text>
                </View>
            </View>

            {/* Definition Card */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Définition</Text>
                <Text style={[styles.description, dynamicStyles.textSecondary]}>
                    Un <Text style={[styles.bold, dynamicStyles.text]}>streak</Text> est une série consécutive de jours où vous avez complété <Text style={[styles.bold, dynamicStyles.text]}>100% de vos tâches</Text>. C'est une mesure de votre consistance et de votre engagement.
                </Text>
            </View>

            {/* How it works */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Comment ça fonctionne ?</Text>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Chaque jour compte pour votre streak
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Vous devez compléter <Text style={[styles.bold, dynamicStyles.text]}>TOUTES vos tâches</Text> pour maintenir le streak
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Si vous manquez une seule tâche, le streak s'interrompt
                    </Text>
                </View>

                <View style={styles.bulletPoint}>
                    <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                    <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>
                        Le streak se compte à partir de <Text style={[styles.bold, dynamicStyles.text]}>jours passés</Text>, pas aujourd'hui
                    </Text>
                </View>
            </View>

            {/* Conditions */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Conditions pour avoir un Streak</Text>

                <View style={styles.conditionBox}>
                    <Text style={[styles.conditionNumber, dynamicStyles.text]}>1</Text>
                    <View style={styles.conditionContent}>
                        <Text style={[styles.conditionTitle, dynamicStyles.text]}>Complétude à 100%</Text>
                        <Text style={[styles.conditionDescription, dynamicStyles.textSecondary]}>
                            Vous devez compléter tous vos objectifs du jour. Une seule tâche incomplète cassera la chaîne.
                        </Text>
                    </View>
                </View>

                <View style={styles.conditionBox}>
                    <Text style={[styles.conditionNumber, dynamicStyles.text]}>2</Text>
                    <View style={styles.conditionContent}>
                        <Text style={[styles.conditionTitle, dynamicStyles.text]}>Consécutivité</Text>
                        <Text style={[styles.conditionDescription, dynamicStyles.textSecondary]}>
                            Les jours doivent être consécutifs. Un jour manqué interrompt immédiatement votre streak.
                        </Text>
                    </View>
                </View>

                <View style={styles.conditionBox}>
                    <Text style={[styles.conditionNumber, dynamicStyles.text]}>3</Text>
                    <View style={styles.conditionContent}>
                        <Text style={[styles.conditionTitle, dynamicStyles.text]}>Compter les jours passés</Text>
                        <Text style={[styles.conditionDescription, dynamicStyles.textSecondary]}>
                            Seuls les jours précédents aujourd'hui sont comptabilisés. Le jour courant n'est pas inclus dans le calcul.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Example */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Exemple</Text>
                <View style={styles.exampleBox}>
                    <Text style={[styles.exampleLabel, dynamicStyles.text]}>✓ Jour 1 - Toutes tâches complètes</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.text]}>✓ Jour 2 - Toutes tâches complètes</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.text]}>✓ Jour 3 - Toutes tâches complètes</Text>
                    <Text style={[styles.exampleResult, dynamicStyles.text]}>
                        → Streak de 3 jours
                    </Text>
                </View>

                <View style={styles.exampleBox}>
                    <Text style={[styles.exampleLabel, dynamicStyles.text]}>✓ Jour 1 - Toutes tâches complètes</Text>
                    <Text style={[styles.exampleLabel, dynamicStyles.text]}>✓ Jour 2 - Toutes tâches complètes</Text>
                    <Text style={[styles.exampleLabelFail, dynamicStyles.textSecondary]}>✗ Jour 3 - Une tâche manquée</Text>
                    <Text style={[styles.exampleResult, dynamicStyles.text]}>
                        → Streak cassé, recommence à 0
                    </Text>
                </View>
            </View>

            {/* Tips */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>💡 Conseils</Text>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Restez constant</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Un streak est une belle manière de mesurer votre engagement. Essayez de maintenir vos streaks le plus longtemps possible !
                    </Text>
                </View>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Planifiez vos tâches</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Assurez-vous que vos objectifs quotidiens sont réalistes pour pouvoir les compléter tous les jours.
                    </Text>
                </View>

                <View style={styles.tipBox}>
                    <Text style={[styles.tipTitle, dynamicStyles.text]}>Célébrez vos progrès</Text>
                    <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>
                        Chaque jour complété est une victoire ! Prolongez votre streak et voyez jusqu'où vous pouvez aller.
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

    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    backText: {
        fontSize: 28,
        fontWeight: '600',
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

    /* Condition Boxes */
    conditionBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 15,
        alignItems: 'flex-start',
    },

    conditionNumber: {
        fontSize: 18,
        fontWeight: '700',
        minWidth: 35,
    },

    conditionContent: {
        flex: 1,
        gap: 5,
    },

    conditionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    conditionDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    /* Example Boxes */
    exampleBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        gap: 8,
    },

    exampleLabel: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },

    exampleLabelFail: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
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