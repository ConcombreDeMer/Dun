import { Link } from "expo-router";
import { TouchableOpacity, Image, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../lib/ThemeContext";
import { getImageSource } from "../lib/imageHelper";

interface ActionButtonProps {
  destination: string;
  scale: "large" | "small";
  content: "text" | "image";
  label?: string;
  icon?: string;
  onPress?: () => void;
}

export const ActionButton = ({
  destination,
  scale,
  content,
  label = "+",
  icon = "cancel",
  onPress,
}: ActionButtonProps) => {
  const { colors, theme } = useTheme();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress?.();
  };

  const sizeStyles = scale === "large" ? styles.large : styles.small;
  const imageSize = scale === "large" ? 34 : 24;

  return (
    <Link
      style={[sizeStyles, { backgroundColor: colors.actionButton }]}
      href={destination}
      asChild
    >
      <TouchableOpacity onPress={handlePress}>
        {content === "image" ? (
          <Image
            style={{
              width: imageSize,
              height: imageSize,
              transform: [{ rotate: "45deg" }],
            }}
            source={getImageSource(icon, theme)}
          />
        ) : (
          <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
        )}
      </TouchableOpacity>
    </Link>
  );
};

const styles = StyleSheet.create({
  large: {
    height: 70,
    width: 70,
    borderRadius: 100,
    position: "absolute",
    bottom: 30,
    right: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    height: 50,
    width: 50,
    borderRadius: 10,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 30,
    lineHeight: 65,
    fontFamily: "Satoshi-Bold",
  },
});
