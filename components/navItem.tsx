import { getImageSource } from '@/lib/imageHelper';
import { useTheme } from '@/lib/ThemeContext';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NavItemProps {
    image?: any;
    title?: string;
    onPress?: () => void;
}

export default function NavItem({ image, title, onPress }: NavItemProps) {
    const { theme, colors } = useTheme();
    return (
        <TouchableOpacity style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {image &&
                    <Image
                        style={{ width: 26, height: 26, tintColor: colors.text }}
                        source={getImageSource(image, theme)}
                    ></Image>
                }
                {title && <Text style={[styles.label, { color: colors.text }]}>{title}</Text>}
            </View>
            <View>
                <Image
                    style={{ width: 29, height: 29, transform: [{ rotate: '-90deg' }], tintColor: colors.text }}
                    source={getImageSource("chevron", theme)}
                ></Image>
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
        borderWidth: 0.5,
    },
    label: {
        fontSize: 16,
        fontFamily: 'Satoshi-Regular',
    },


});
