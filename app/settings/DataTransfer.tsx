import Headline from "@/components/headline";
import SecondaryButton from "@/components/secondaryButton";
import Squircle from "@/components/Squircle";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { getCharacterImageSource } from "@/lib/imageHelper";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

type DataTransferOptionProps = {
  description: string;
  icon: "square.and.arrow.down" | "square.and.arrow.up";
  onPress: () => void;
  title: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function DataTransferOption({ description, icon, onPress, title }: DataTransferOptionProps) {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const scale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pressOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 18, stiffness: 320 });
    pressOpacity.value = withTiming(0.88, { duration: 90 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
    pressOpacity.value = withTiming(1, { duration: 120 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      <Squircle style={[styles.option, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.optionIcon, { backgroundColor: colors.background }]}>
          <SymbolView name={icon} size={26} tintColor={colors.text} type="palette" />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, { color: colors.text, fontSize: fontSizes.xl }]}>
            {title}
          </Text>
          <Text style={[styles.optionDescription, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
            {description}
          </Text>
        </View>
        <SymbolView name="chevron.right" size={18} tintColor={colors.textSecondary} type="palette" />
      </Squircle>
    </AnimatedPressable>
  );
}

export default function DataTransfer() {
  const router = useRouter();
  const { colors, actualTheme } = useTheme();
  const { t } = useAppTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SecondaryButton onPress={() => router.back()} image="chevron.left" />
        <Headline
          title={t("settings.account.dataTransfer.headline.title")}
          subtitle={t("settings.account.dataTransfer.headline.subtitle")}
        />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Image
          entering={FadeInUp.springify()}
          source={getCharacterImageSource("9", actualTheme)}
          style={styles.character}
          resizeMode="contain"
        />

        <View style={styles.options}>
          <DataTransferOption
            title={t("settings.account.dataTransfer.export.title")}
            description={t("settings.account.dataTransfer.export.description")}
            icon="square.and.arrow.down"
            onPress={() => router.push("/settings/ExportData")}
          />
          <DataTransferOption
            title={t("settings.account.dataTransfer.import.title")}
            description={t("settings.account.dataTransfer.import.description")}
            icon="square.and.arrow.up"
            onPress={() => router.push("/settings/ImportData")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 22,
  },
  character: {
    width: 150,
    height: 150,
    alignSelf: "center",
  },
  options: {
    gap: 14,
  },
  option: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  optionTitle: {
    fontFamily: "Satoshi-Bold",
  },
  optionDescription: {
    fontFamily: "Satoshi-Regular",
    lineHeight: 21,
  },
});
