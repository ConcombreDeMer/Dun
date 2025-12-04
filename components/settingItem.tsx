import { getImageSource } from '@/lib/imageHelper';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StyleSheet } from 'react-native';

interface SettingItemProps {
    image?: any;
    title?: string;
    subtitle?: string;
    onPress?: () => void;
    rightContent?: React.ReactNode;
    type?: 'default' | 'danger';
}

export default function SettingItem({ image, title, subtitle, onPress, rightContent, type = 'default' }: SettingItemProps) {
    const { theme } = useTheme();
    const isDanger = type === 'danger';
    const iconTintColor = isDanger ? '#A10606' : '#000000';
    const textColor = isDanger ? '#A10606' : '#000000';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <View style={styles.container}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    {image &&
                        <Image
                            style={{ width: 26, height: 26, tintColor: iconTintColor }}
                            source={getImageSource(image, theme)}
                        ></Image>
                    }
                    <View style={{ flex: 1 }}>
                        {title && <Text style={[styles.label, { color: textColor }]}>{title}</Text>}
                        {subtitle && <Text style={[styles.subtitle, { color: isDanger ? '#A10606' : '#999' }]}>{subtitle}</Text>}
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
        backgroundColor: '#F1F1F1',
        height: 64,
        borderRadius: 10,
        paddingHorizontal: 23,
    },
    label: {
        fontSize: 16,
        fontFamily: 'Satoshi-Regular',
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Satoshi-Regular',
        color: '#999',
        marginTop: 2,
    },
});
