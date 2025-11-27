import { getImageSource } from '@/lib/imageHelper';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StyleSheet } from 'react-native';

interface NavItemProps {
    image?: any;
    title?: string;
}

export default function NavItem({ image, title }: NavItemProps) {
    const { theme } = useTheme();
    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {image &&
                    <Image
                        style={{ width: 26, height: 26, tintColor: '#000000' }}
                        source={getImageSource(image, theme)}
                    ></Image>
                }
                {title && <Text style={styles.label}>{title}</Text>}
            </View>
            <View>
                <Image
                    style={{ width: 29, height: 29, transform: [{ rotate: '-90deg' }] }}
                    source={getImageSource("chevron", theme)}
                ></Image>
            </View>
        </View>
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


});
