import { useFont } from '@/lib/FontContext';
import { useTheme } from '@/lib/ThemeContext';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SettingItemProps {
    image?: any;
    title?: string;
    subtitle?: string;
    onPress?: () => void;
    rightContent?: React.ReactNode;
    type?: 'default' | 'danger';
    border?: boolean;
}

export default function SettingItem({ image, title, subtitle, onPress, rightContent, type = 'default', border = false }: SettingItemProps) {
    const { colors } = useTheme();
    const { fontSizes } = useFont();
    const isDanger = type === 'danger';
    const iconTintColor = isDanger ? colors.danger : colors.icon;
    const textColor = isDanger ? colors.danger : colors.text;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: border ? 0.5 : 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    {image &&
                        <SymbolView
                            name={image}
                            style={{ width: 24, height: 24 }}
                            type="palette"
                            tintColor={iconTintColor}
                        />
                    }
                    <View style={{ flex: 1 }}>
                        {title && <Text style={[styles.label, { color: textColor, fontSize: fontSizes.lg }]}>{title}</Text>}
                        {subtitle && <Text style={[styles.subtitle, { color: isDanger ? colors.danger : colors.textSecondary, fontSize: fontSizes.sm }]}>{subtitle}</Text>}
                    </View>
                </View>
                {rightContent}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        borderRadius: 10,
        paddingHorizontal: 23,
    },
    label: {
        fontFamily: 'Satoshi-Regular',
    },
    subtitle: {
        fontFamily: 'Satoshi-Regular',
        marginTop: 2,
    },
});
