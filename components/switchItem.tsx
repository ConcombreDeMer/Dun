import { getImageSource } from '@/lib/imageHelper';
import { useTheme } from '@/lib/ThemeContext';
import { useState } from 'react';
import { Image, StyleSheet, Switch, Text, View } from 'react-native';

interface SwitchItemProps {
    image?: any;
    title?: string;
    event?: (value: boolean) => void;
    currentValue?: boolean;
}

export default function SwitchItem({ image, title, event, currentValue }: SwitchItemProps) {
    const { theme, colors } = useTheme();
    const [isEnabled, setIsEnabled] = useState(false);

    const toggleSwitch = (value: boolean) => {
        setIsEnabled(value);
        event?.(value);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {image &&
                    <Image
                        style={{ width: 26, height: 26, tintColor: colors.text }}
                        source={getImageSource(image, theme)}
                    ></Image>
                }
                {title && <Text style={[styles.label, { color: colors.text }]}>{title}</Text>}
            </View>
            <Switch
                trackColor={{ false: "#ccc", true: "#000" }}
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
        borderRadius: 10,
        paddingHorizontal: 23,
        borderWidth: 0.5,
    },
    label: {
        fontSize: 16,
        fontFamily: 'Satoshi-Regular',
    },


});