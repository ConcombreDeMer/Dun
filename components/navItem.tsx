import { useFont } from '@/lib/FontContext';
import { getImageSource } from '@/lib/imageHelper';
import { useTheme } from '@/lib/ThemeContext';
import { SquircleButton } from 'expo-squircle-view';
import { SymbolView } from 'expo-symbols';
import { Image, StyleSheet, Text, View } from 'react-native';

interface NavItemProps {
    image?: any;
    title?: string;
    onPress?: () => void;
    transparent?: boolean;
}

export default function NavItem({ image, title, onPress, transparent }: NavItemProps) {
    const { actualTheme, colors } = useTheme();
    const { fontSizes } = useFont();
    return (
        <SquircleButton style={[styles.container, transparent ? { borderWidth: 0 } : { backgroundColor: colors.card, borderColor: colors.border, height: 64 }]} onPress={onPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {image &&
                    <SymbolView
                        name={image}
                        type="palette"
                        tintColor={colors.text}
                    />
                }
                {title && <Text style={[styles.label, { color: colors.text, fontSize: fontSizes.lg }]}>{title}</Text>}
            </View>
            <View>
                <Image
                    style={{ width: 29, height: 29, transform: [{ rotate: '-90deg' }], tintColor: colors.text }}
                    source={getImageSource("chevron", actualTheme)}
                ></Image>
            </View>
        </SquircleButton>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 15,
        paddingHorizontal: 23,
        borderWidth: 0.5,
    },
    label: {
        fontFamily: 'Satoshi-Regular',
    },


});
