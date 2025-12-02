import React, { useState } from 'react';
import { TextInput, View, StyleSheet, Text, TextStyle, ViewStyle, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SimpleInputProps {
    name?: string;
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    multiline?: boolean;
    style?: TextStyle | TextStyle[];
    containerStyle?: ViewStyle;
    labelStyle?: TextStyle;
    placeholderTextColor?: string;
    scale?: 'small' | 'large';
    center?: boolean;
    facultatif?: boolean;
    password?: boolean;
    bold?: boolean;
}

export default function SimpleInput({
    name,
    placeholder = '...',
    value = '',
    onChangeText,
    multiline = false,
    style,
    containerStyle,
    labelStyle,
    placeholderTextColor = '#999',
    scale = 'small',
    center = false,
    facultatif = false,
    password = false,
    bold = false,
}: SimpleInputProps) {
    const [text, setText] = useState(value);
    const [showPassword, setShowPassword] = useState(false);

    React.useEffect(() => {
        setText(value);
    }, [value]);

    const handleChange = (input: string) => {
        setText(input);
        if (onChangeText) {
            onChangeText(input);
        }
    };

    const getInputHeight = () => {
        return scale === 'large' ? 64 : 48;
    };

    return (
        <View style={[styles.container, containerStyle]}>

            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {name && <Text style={[styles.label, labelStyle]}>{name}</Text>}
                {facultatif && <Text style={{ color: '#999', fontSize: 14, fontStyle:"italic"}}>(facultatif)</Text>}
            </View>

            <TextInput
                style={[style, multiline ? styles.inputMultiline : { ...styles.input, height: getInputHeight() }, center && { textAlign: 'center' }, { fontWeight: bold ? '600' : '200' }]}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor}
                value={text}
                onChangeText={handleChange}
                multiline={multiline}
                secureTextEntry={password && !showPassword}
            />
            {password && (
                <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                >
                    <MaterialIcons
                        name={showPassword ? 'visibility' : 'visibility-off'}
                        size={20}
                        color="#666"
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        position: 'relative',
    },
    label: {
        fontSize: 20,
        fontFamily: 'Satoshi-Regular',
        marginBottom: 5,
        color: '#000',
    },
    input: {
        width: '100%',
        height: 48,
        backgroundColor: '#F1F1F1',
        borderWidth: 1,
        borderColor: '#00000020',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        fontWeight: '600',
    },
    inputMultiline: {
        width: '100%',
        minHeight: 100,
        backgroundColor: '#F1F1F1',
        borderWidth: 1,
        borderColor: '#00000020',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        fontWeight: '600',
        textAlignVertical: 'top',
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: [{ translateY: "-50%" }],
        padding: 8,
        backgroundColor: '#F1F1F1',
    },
});
