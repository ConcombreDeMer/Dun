import { useFont } from '@/lib/FontContext';
import { useTheme } from '@/lib/ThemeContext';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

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
    const iconTintColor = colors.text;

    const toggleSwitch = (value: boolean) => {
        setIsEnabled(value);
        event?.(value);
    };

    return (
        <View style={[styles.container]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {image &&
                    <SymbolView
                        name={image}
                        type="palette"
                        tintColor={iconTintColor}
                    />
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