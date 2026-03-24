import { useFont } from '@/lib/FontContext';
import { getImageSource } from '@/lib/imageHelper';
import { useTheme } from '@/lib/ThemeContext';
import { useState } from 'react';
import { Image, StyleSheet, Switch, Text, View } from 'react-native';

interface SwitchItemProps {
    image?: any;
    title?: string;
    event?: (value: boolean) => void;
    currentValue?: boolean;
    activeColor?: string;
}

export default function SwitchItem({ image, title, event, currentValue, activeColor = "#000" }: SwitchItemProps) {
    const { colors, actualTheme } = useTheme();
    const { fontSizes } = useFont();
    const [isEnabled, setIsEnabled] = useState(false);

    const toggleSwitch = (value: boolean) => {
        setIsEnabled(value);
        event?.(value);
    };

    return (
        <View style={[styles.container]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {image &&
                    <Image
                        style={{ width: 26, height: 26, tintColor: colors.text }}
                        source={getImageSource(image, actualTheme)}
                    ></Image>
                }
                {title && <Text style={[styles.label, { color: colors.text, fontSize: fontSizes.lg }]}>{title}</Text>}
            </View>
            <Switch
                trackColor={{ false: "#ccc", true: activeColor }}
                thumbColor="#fff"
                onValueChange={toggleSwitch}
                value={currentValue}
                style={{ alignSelf: 'center' }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
    },
    label: {
        fontFamily: 'Satoshi-Regular',
    },


});