import { Link } from "expo-router";
import { TouchableOpacity, Image, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../lib/ThemeContext";
import { getImageSource } from "../lib/imageHelper";

interface ActionButtonProps {
    scale: "large" | "small";
    content: "text" | "image";
    label?: string;
    icon?: string;
    backColor?: string;
    onPress?: () => void;
    position?: "left" | "right";
}

export const ActionButton = ({
    scale,
    content,
    backColor,
    label = "",
    icon = "",
    onPress,
    position = "right",
}: ActionButtonProps) => {
    const { colors, theme } = useTheme();

    const handlePress = async () => {
        if (icon === 'delete' || label === "Créer la tâche" || label === "Modifier la tâche" ) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
    };

    const sizeStyles = scale === "large" ? styles.large : styles.small;
    const positionStyle = position === "left" ? styles.positionLeft : styles.positionRight;
    const imageSize = 34;

    return (

            <TouchableOpacity 
            
            style={[sizeStyles, positionStyle, { backgroundColor: backColor || colors.actionButton }]}
            onPress={handlePress}>
                {content === "image" ? (
                    <Image
                        style={{
                            width: imageSize,
                            height: imageSize,
                        }}
                        source={getImageSource(icon, theme)}
                    />
                ) : (
                    <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
                )}
            </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    large: {
        height: 70,
        width: '70%',
        borderRadius: 100,
        position: "absolute",
        bottom: 30,
        alignItems: "center",
        justifyContent: "center",
    },
    small: {
        height: 70,
        width: 70,
        borderRadius: 100,
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        bottom: 30,
    },
    positionLeft: {
        left: 30,
    },
    positionRight: {
        right: 30,
    },
    text: {
        fontSize: 20,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
});
