import { getImageSource } from '@/lib/imageHelper';
import { View, TouchableOpacity, Text, Image, Switch } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StyleSheet } from 'react-native';
import { useState } from 'react';

interface SwitchItemProps {
    image?: any;
    title?: string;
    event?: (value: boolean) => void;
    currentValue?: boolean;
}

export default function SwitchItem({ image, title, event, currentValue }: SwitchItemProps) {
    const { theme } = useTheme();
    const [isEnabled, setIsEnabled] = useState(false);

    const toggleSwitch = (value: boolean) => {
        setIsEnabled(value);
        event?.(value);
    };

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