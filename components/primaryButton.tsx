import { LinearGradient } from 'expo-linear-gradient';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import SquircleView from "react-native-fast-squircle";
import { useFont } from "../lib/FontContext";
import { useTheme } from "../lib/ThemeContext";


interface PrimaryButtonProps {
    title?: string;
    onPress: () => void;
    disabled?: boolean;
    image?: SFSymbol | '';
    size?: 'L' | 'M' | 'S' | 'XS';
    style?: ViewStyle;
    type?: 'danger' | 'reverse'
    width?: number;
    height?: number;
}

export default function PrimaryButton({ title, onPress, disabled = false, image = '', size = 'L', style, type, width, height }: PrimaryButtonProps) {
    const { colors, theme } = useTheme();
    const { fontSizes } = useFont();

    const getButtonStyle = () => {
        let baseStyle: any = {
            backgroundColor: colors.actionButton,
            width: '100%',
            height: height || 64,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 12,
            overflow: 'hidden',
        };

        if (size === 'S') baseStyle.width = '50%';
        if (size === 'M') baseStyle.width = '80%';
        if (size === 'XS') {
            baseStyle = { ...baseStyle, width: 64, aspectRatio: 1 };
        }

        if (type === 'danger') {
            baseStyle.backgroundColor = '#F7C1C1';
        } else if (type === 'reverse') {
            baseStyle.backgroundColor = colors.background;
            baseStyle.borderWidth = 1;
            baseStyle.borderColor = colors.actionButton;
        }

        if (disabled) {
            baseStyle.opacity = 0.5;
        }

        // Appliquer le height personnalisé en dernier pour qu'il soit prioritaire
        if (width) {
            baseStyle.width = width;
        }

        return baseStyle;
    };

    const getTextStyle = () => {
        let baseTextStyle: any = {
            color: colors.buttonText,
            fontSize: fontSizes['3xl'],
            fontFamily: 'Satoshi-Medium',
        };

        if (type === 'danger') {
            baseTextStyle.color = '#A10606';
        } else if (type === 'reverse') {
            baseTextStyle.color = colors.actionButton;
        }

        return baseTextStyle;
    };

    return (
        <SquircleView
            style={[getButtonStyle(), style]}
            // onPress={onPress}
            // disabled={disabled}
            cornerSmoothing={1}
        >
            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            >

            </Pressable>

            {
                type !== 'danger' && type !== 'reverse' &&  (

                    <LinearGradient
                        colors={['#484848', '#171717']}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 0,
                        }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                )
            }




            {image &&
                <SymbolView
                    name={image}
                    style={{ width: 24, height: 24, alignSelf: 'center' }}
                    type="palette"
                    tintColor={colors.buttonText}
                />
            }
            {(size === 'L' || size === 'M' || size === 'S') && title && <Text style={getTextStyle()}>{title}</Text>}
        </SquircleView>
    );
}

const styles = StyleSheet.create({});
