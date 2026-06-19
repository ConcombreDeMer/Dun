import { useTheme } from '@/lib/ThemeContext';
import { useAppTranslation } from '@/lib/i18n';
import { getStatsImageSource } from '@/lib/imageHelper';
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

export default function ChargeExplain() {
    const { colors, actualTheme } = useTheme();
    const { t } = useAppTranslation();
    const bullets = t('stats.chargeExplain.bullets', { returnObjects: true }) as string[];
    const levels = t('stats.chargeExplain.levels', { returnObjects: true }) as { title: string; description: string }[];
    const interpretations = t('stats.chargeExplain.interpretations', { returnObjects: true }) as { emoji: string; title: string; description: string }[];
    const exampleLines = t('stats.chargeExplain.exampleLines', { returnObjects: true }) as string[];
    const tips = t('stats.chargeExplain.tips', { returnObjects: true }) as { title: string; description: string }[];

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
                        source={getStatsImageSource('charge', actualTheme)}
                        style={styles.headerImage}
                    />
                    <Text style={[styles.title, dynamicStyles.text]}>{t('stats.chargeExplain.title')}</Text>
                </View>
            </View>

            {/* Definition Card */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.chargeExplain.definitionTitle')}</Text>
                <Text style={[styles.description, dynamicStyles.textSecondary]}>{t('stats.chargeExplain.definition')}</Text>
            </View>

            {/* How it's calculated */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.chargeExplain.howTitle')}</Text>
                {bullets.map((bullet) => (
                    <View style={styles.bulletPoint} key={bullet}>
                        <View style={[styles.bulletDot, dynamicStyles.bullet]} />
                        <Text style={[styles.bulletText, dynamicStyles.textSecondary]}>{bullet}</Text>
                    </View>
                ))}
            </View>

            {/* Charge Levels */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.chargeExplain.levelsTitle')}</Text>

                {levels.map((level, index) => (
                    <View style={[styles.chargeBox, dynamicStyles.surface]} key={level.title}>
                        <View style={[styles.chargeDot, { backgroundColor: ['#FF4C4C', '#ffcd6fff', '#74ca77ff'][index] }]} />
                        <View style={styles.chargeContent}>
                            <Text style={[styles.chargeLevel, dynamicStyles.text]}>{level.title}</Text>
                            <Text style={[styles.chargeDescription, dynamicStyles.textSecondary]}>{level.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Interpretation */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.chargeExplain.interpretationTitle')}</Text>

                {interpretations.map((item) => (
                    <View style={[styles.interpretBox, dynamicStyles.surface]} key={item.title}>
                        <Text style={[styles.interpretNumber, dynamicStyles.text]}>{item.emoji}</Text>
                        <View style={styles.interpretContent}>
                            <Text style={[styles.interpretTitle, dynamicStyles.text]}>{item.title}</Text>
                            <Text style={[styles.interpretDescription, dynamicStyles.textSecondary]}>{item.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Example */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.chargeExplain.exampleTitle')}</Text>
                
                <Text style={[styles.exampleSubtitle, dynamicStyles.text]}>{t('stats.chargeExplain.exampleSubtitle')}</Text>
                <View style={[styles.exampleBox, dynamicStyles.surface]}>
                    {exampleLines.map((line, index) => (
                        <Text key={line} style={index === exampleLines.length - 1 ? [styles.exampleResult, dynamicStyles.text, dynamicStyles.divider] : [styles.exampleLabel, dynamicStyles.textSecondary]}>{line}</Text>
                    ))}
                </View>
            </View>

            {/* Tips */}
            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('stats.chargeExplain.tipsTitle')}</Text>
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
