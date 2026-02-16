import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardType, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useFont } from '../lib/FontContext';
import { useTheme } from '../lib/ThemeContext';

type FontSizeKey = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';

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
    transparent?: boolean;
    initialEditable?: boolean;
    fontSize?: FontSizeKey | number;
    isLoading?: boolean;
    type?: KeyboardType;
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
    transparent = false,
    fontSize,
    isLoading = false,
    type = 'default',
}: SimpleInputProps) {
    const [text, setText] = useState(value);
    const [showPassword, setShowPassword] = useState(false);
    const [isEditable, setIsEditable] = useState(true);
    const skeletonOpacity = useRef(new Animated.Value(0.3)).current;
    const { colors } = useTheme();
    const { fontSizes } = useFont();

    useEffect(() => {
        if (isLoading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(skeletonOpacity, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: false,
                    }),
                    Animated.timing(skeletonOpacity, {
                        toValue: 0.3,
                        duration: 1000,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        }
    }, [isLoading, skeletonOpacity]);


    const disableEditing = () => setIsEditable(false);
    const enableEditing = () => setIsEditable(true);

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
                {name && <Text style={[styles.label, labelStyle, { color: colors.text, fontSize: fontSizes['2xl'] }]}>{name}</Text>}
                {facultatif && <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm, fontStyle: "italic" }}>(facultatif)</Text>}
            </View>

            {
                isLoading && (
                    <Animated.View
                        style={[
                            styles.skeleton,
                            {
                                height: scale === 'large' ? 64 : 48,
                                opacity: skeletonOpacity,
                                backgroundColor: colors.input,
                            }
                        ]}
                    />
                )
            }

            {!isLoading && (

                <View>
                    <TextInput
                        style={[style, multiline ? styles.inputMultiline : { ...styles.input, height: getInputHeight() }, center && { textAlign: 'center' }, { fontWeight: bold ? '400' : '200' }, transparent && { backgroundColor: 'transparent', borderWidth: 0 }, { fontSize: fontSize ? fontSizes[fontSize] : fontSizes.lg, backgroundColor: transparent ? 'transparent' : colors.input, borderColor: colors.border, color: colors.text }]}
                        placeholder={placeholder}
                        placeholderTextColor={colors.inputPlaceholder}
                        value={text}
                        onChangeText={handleChange}
                        multiline={multiline}
                        secureTextEntry={password && !showPassword}
                        onTouchMove={disableEditing}
                        onTouchEnd={enableEditing}
                        onTouchCancel={enableEditing}
                        editable={isEditable}
                        autoCorrect={false}
                        keyboardType={type}
                    />

                    {password && (
                        <TouchableOpacity
                            style={[styles.eyeButton, { backgroundColor: colors.input }]}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <MaterialIcons
                                name={showPassword ? 'visibility' : 'visibility-off'}
                                size={20}
                                color={colors.icon}
                            />
                        </TouchableOpacity>
                    )}
                </View>
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
        fontFamily: 'Satoshi-Regular',
        marginBottom: 5,
    },
    input: {
        width: '100%',
        height: 48,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontWeight: '600',
    },
    inputMultiline: {
        width: '100%',
        minHeight: 100,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 240,
        fontWeight: '600',
        textAlignVertical: 'top',
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: [{ translateY: "-50%" }],
        padding: 8,
    },
    skeleton: {
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#00000020',        
    },
});
