import { StatsPeriod } from "@/lib/calculateStats";
import { useFont } from "@/lib/FontContext";
import { useTheme } from "@/lib/ThemeContext";
import { Pressable, StyleSheet, Text, View } from "react-native";

type StatsPeriodMenuProps = {
  period: StatsPeriod;
  periodOptions: StatsPeriod[];
  getDisplayedPeriod: (period: StatsPeriod) => string;
  onPeriodChange: (period: StatsPeriod) => void;
};

export default function StatsPeriodMenu({
  period,
  periodOptions,
  getDisplayedPeriod,
  onPeriodChange,
}: StatsPeriodMenuProps) {
  const { colors } = useTheme();
  const { fontSizes } = useFont();

  return (
    <View style={[styles.container, { backgroundColor: colors.input }]}>
      {periodOptions.map((option) => {
        const isSelected = option === period;

        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onPeriodChange(option)}
            style={[
              styles.option,
              { backgroundColor: isSelected ? colors.text : "transparent" },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.optionText,
                {
                  color: isSelected ? colors.card : colors.textSecondary,
                  fontSize: fontSizes.xs,
                },
              ]}
            >
              {getDisplayedPeriod(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    width: "100%",
  },
  option: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    height: 30,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 8,
  },
  optionText: {
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
  },
});
