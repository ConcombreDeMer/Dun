import { StatsPeriod } from "@/lib/calculateStats";
import { useTheme } from "@/lib/ThemeContext";
import { Host } from "@expo/ui";
import { Picker, Text } from "@expo/ui/swift-ui";
import { frame, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

type StatsPeriodMenuProps = {
  period: StatsPeriod;
  periodOptions: StatsPeriod[];
  getDisplayedPeriod: (period: StatsPeriod) => string;
  onPeriodChange: (period: StatsPeriod) => void;
};

export default memo(function StatsPeriodMenu({
  period,
  periodOptions,
  getDisplayedPeriod,
  onPeriodChange,
}: StatsPeriodMenuProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Host matchContents ignoreSafeArea="all">
        <Picker<StatsPeriod>
          label="Période"
          selection={period}
          onSelectionChange={(selection) => {
            if (selection) {
              onPeriodChange(selection);
            }
          }}
          modifiers={[
            pickerStyle("segmented"),
            frame({ minHeight: 38 }),
            tint(colors.taskDone),
          ]}
        >
          {periodOptions.map((option) => (
            <Text key={option} modifiers={[tag(option)]}>
              {getDisplayedPeriod(option)}
            </Text>
          ))}
        </Picker>
      </Host>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    minHeight: 42,
    // width: "100%",
  },
});
