import { useTheme } from '@/lib/ThemeContext';
import { useAppTranslation } from '@/lib/i18n';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const mixHexColors = (from: string, to: string, amount: number) => {
    const parseHex = (hex: string) => {
        const cleanHex = hex.replace('#', '').slice(0, 6);
        const value = parseInt(cleanHex, 16);

        return {
            r: (value >> 16) & 255,
            g: (value >> 8) & 255,
            b: value & 255,
        };
    };

    const fromRgb = parseHex(from);
    const toRgb = parseHex(to);
    const mixed = {
        r: Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * amount),
        g: Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * amount),
        b: Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * amount),
    };

    return `#${mixed.r.toString(16).padStart(2, '0')}${mixed.g.toString(16).padStart(2, '0')}${mixed.b.toString(16).padStart(2, '0')}`;
};

export default function StreakExplain() {
    const { colors } = useTheme();
    const { t } = useAppTranslation();
    const bullets = t('stats.streakExplain.bullets', { returnObjects: true }) as string[];
    const conditions = t('stats.streakExplain.conditions', { returnObjects: true }) as { title: string; description: string }[];
    const exampleSuccess = t('stats.streakExplain.exampleSuccess', { returnObjects: true }) as string[];
    const exampleFail = t('stats.streakExplain.exampleFail', { returnObjects: true }) as string[];
    const tips = t('stats.streakExplain.tips', { returnObjects: true }) as { title: string; description: string }[];

    const dynamicStyles = {
        container: {
            backgroundColor: colors.card,
        },
        header: {
            backgroundColor: colors.card,
        },
        card: {
            backgroundColor: mixHexColors(colors.background, colors.card, 0.45),
            borderColor: colors.border,
        },
        text: {
            color: colors.text,
        },
        textSecondary: {
            color: mixHexColors(colors.textSecondary, colors.text, 0.45),
        },
        surface: {
            backgroundColor: mixHexColors(colors.background, colors.card, 0.32),
        },
        bullet: {
            borderColor: colors.border,
        },
        handler: {
            backgroundColor: colors.border,
        },
        divider: {
            borderTopColor: colors.border,
        },
    };

    return (
        <ScrollView style={[styles.container, dynamicStyles.container]}>
            {/* Header */}
            <View style={[styles.header, dynamicStyles.header]}>
                <View style={[styles.handler, dynamicStyles.handler]} />
                
                <View style={styles.headerContent}>
                    <Image
                        source={require('@/assets/images/stats/streak/high.png')}
                        style={styles.headerImage}
                    />
                    <Text style={[styles.title, dynamicStyles.text]}>{t('stats.streakExplain.title')}</Text>
                </View>
            </View>

            {/* Definition Card */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.streakExplain.definitionTitle')}</Text>
                <Text style={[styles.description, dynamicStyles.textSecondary]}>{t('stats.streakExplain.definition')}</Text>
            </View>

            {/* How it works */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.streakExplain.howTitle')}</Text>
                {bullets.map((bullet) => (
                    <View style={styles.bulletPoint} key={bullet}>
                        <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                        <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>{bullet}</Text>
                    </View>
                ))}
            </View>

            {/* Conditions */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.streakExplain.conditionsTitle')}</Text>
                {conditions.map((condition, index) => (
                    <View style={[styles.conditionBox, dynamicStyles.surface]} key={condition.title}>
                        <Text style={[styles.conditionNumber, dynamicStyles.text]}>{index + 1}</Text>
                        <View style={styles.conditionContent}>
                            <Text style={[styles.conditionTitle, dynamicStyles.text]}>{condition.title}</Text>
                            <Text style={[styles.conditionDescription, dynamicStyles.textSecondary]}>{condition.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Example */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.streakExplain.exampleTitle')}</Text>
                <View style={[styles.exampleBox, dynamicStyles.surface]}>
                    {exampleSuccess.map((line) => (
                        <Text key={line} style={[styles.exampleLabel, dynamicStyles.text]}>{line}</Text>
                    ))}
                </View>

                <View style={[styles.exampleBox, dynamicStyles.surface]}>
                    {exampleFail.map((line, index) => (
                        <Text key={line} style={index === 2 ? [styles.exampleLabelFail, dynamicStyles.textSecondary] : [styles.exampleLabel, dynamicStyles.text]}>{line}</Text>
                    ))}
                </View>
            </View>

            {/* Tips */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.streakExplain.tipsTitle')}</Text>
                {tips.map((tip) => (
                    <View style={[styles.tipBox, dynamicStyles.surface]} key={tip.title}>
                        <Text style={[styles.tipTitle, dynamicStyles.text]}>{tip.title}</Text>
                        <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>{tip.description}</Text>
                    </View>
                ))}
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
        position: 'absolute',
        top: 10,
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
    },

    /* Tip Boxes */
    tipBox: {
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
