import { useTheme } from '@/lib/ThemeContext';
import { useAppTranslation } from '@/lib/i18n';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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

export default function AdjustmentExplain() {
    const { colors } = useTheme();
    const { t } = useAppTranslation();
    const bullets = t('stats.adjustmentExplain.bullets', { returnObjects: true }) as string[];
    const counted = t('stats.adjustmentExplain.counted', { returnObjects: true }) as { title: string; description: string }[];
    const notCounted = t('stats.adjustmentExplain.notCounted', { returnObjects: true }) as { title: string; description: string }[];
    const edgeCases = t('stats.adjustmentExplain.edgeCases', { returnObjects: true }) as { title: string; description: string }[];
    const examples = t('stats.adjustmentExplain.examples', { returnObjects: true }) as string[];
    const tips = t('stats.adjustmentExplain.tips', { returnObjects: true }) as { title: string; description: string }[];

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
        iconSurface: {
            backgroundColor: mixHexColors(colors.background, colors.card, 0.35),
            borderColor: colors.border,
        },
        text: {
            color: colors.text,
        },
        textSecondary: {
            color: mixHexColors(colors.textSecondary, colors.text, 0.45),
        },
        bullet: {
            borderColor: colors.border,
        },
    };

    return (
        <ScrollView style={[styles.container, dynamicStyles.container]}>
            <View style={[styles.header, dynamicStyles.header]}>
                <View style={styles.handler} />

                <View style={styles.headerContent}>
                    <View style={[styles.headerIcon, dynamicStyles.iconSurface]}>
                        <SymbolView name="arrow.triangle.2.circlepath" size={44} tintColor={colors.text} />
                    </View>
                    <Text style={[styles.title, dynamicStyles.text]}>{t('stats.adjustmentExplain.title')}</Text>
                </View>
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.adjustmentExplain.definitionTitle')}</Text>
                <Text style={[styles.description, dynamicStyles.textSecondary]}>{t('stats.adjustmentExplain.definition')}</Text>
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.adjustmentExplain.howTitle')}</Text>
                {bullets.map((bullet) => (
                    <View style={styles.bulletPoint} key={bullet}>
                        <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                        <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>{bullet}</Text>
                    </View>
                ))}
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.adjustmentExplain.countedTitle')}</Text>
                {counted.map((item, index) => (
                    <View style={styles.ruleBox} key={item.title}>
                        <Text style={[styles.ruleNumber, dynamicStyles.text]}>{index + 1}</Text>
                        <View style={styles.ruleContent}>
                            <Text style={[styles.ruleTitle, dynamicStyles.text]}>{item.title}</Text>
                            <Text style={[styles.ruleDescription, dynamicStyles.textSecondary]}>{item.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.adjustmentExplain.notCountedTitle')}</Text>
                {notCounted.map((item) => (
                    <View style={styles.infoBox} key={item.title}>
                        <Text style={[styles.infoTitle, dynamicStyles.text]}>{item.title}</Text>
                        <Text style={[styles.infoDescription, dynamicStyles.textSecondary]}>{item.description}</Text>
                    </View>
                ))}
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.adjustmentExplain.edgeCasesTitle')}</Text>
                {edgeCases.map((item) => (
                    <View style={styles.edgeCaseBox} key={item.title}>
                        <Text style={[styles.edgeCaseTitle, dynamicStyles.text]}>{item.title}</Text>
                        <Text style={[styles.edgeCaseDescription, dynamicStyles.textSecondary]}>{item.description}</Text>
                    </View>
                ))}
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.adjustmentExplain.exampleTitle')}</Text>
                <View style={styles.exampleBox}>
                    {examples.map((line, index) => (
                        <Text
                            key={line}
                            style={index === examples.length - 1
                                ? [styles.exampleResult, dynamicStyles.text]
                                : [styles.exampleLabel, dynamicStyles.textSecondary]}
                        >
                            {line}
                        </Text>
                    ))}
                </View>
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.adjustmentExplain.tipsTitle')}</Text>
                {tips.map((tip) => (
                    <View style={styles.tipBox} key={tip.title}>
                        <Text style={[styles.tipTitle, dynamicStyles.text]}>{tip.title}</Text>
                        <Text style={[styles.tipDescription, dynamicStyles.textSecondary]}>{tip.description}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.footer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 40,
    },

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

    headerIcon: {
        width: 82,
        height: 82,
        borderRadius: 41,
        borderWidth: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
    },

    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
    },

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

    description: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '400',
    },

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

    ruleBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 15,
        alignItems: 'flex-start',
    },

    ruleNumber: {
        fontSize: 18,
        fontWeight: '700',
        minWidth: 28,
    },

    ruleContent: {
        flex: 1,
        gap: 5,
    },

    ruleTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    ruleDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    infoBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 7,
    },

    infoTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    infoDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    edgeCaseBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        gap: 7,
        borderLeftWidth: 4,
        borderLeftColor: '#8D9BAA',
    },

    edgeCaseTitle: {
        fontSize: 15,
        fontWeight: '600',
    },

    edgeCaseDescription: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '400',
    },

    exampleBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        padding: 15,
        gap: 8,
    },

    exampleLabel: {
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

    footer: {
        height: 20,
    },
});
