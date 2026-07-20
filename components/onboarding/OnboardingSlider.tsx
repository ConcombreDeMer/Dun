import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

type OnboardingSliderProps = {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
};

export default function OnboardingSlider({
  options,
  selectedIndex,
  onChange,
}: OnboardingSliderProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.value}>{options[selectedIndex]}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${(selectedIndex / (options.length - 1)) * 100}%` },
          ]}
        />
        <View
          style={[
            styles.thumb,
            { left: `${(selectedIndex / (options.length - 1)) * 100}%` },
          ]}
        />
        <View style={styles.hitRow}>
          {options.map((option, index) => (
            <Pressable
              accessibilityLabel={option}
              key={option}
              onPress={() => {
                if (index !== selectedIndex) {
                  void Haptics.selectionAsync();
                }
                onChange(index);
              }}
              style={styles.segment}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    width: "100%",
  },
  value: {
    color: "#555555",
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 26,
    marginBottom: 24,
  },
  track: {
    backgroundColor: "#DADADA",
    borderRadius: 8,
    height: 15,
    position: "relative",
    width: "100%",
  },
  fill: {
    backgroundColor: "#4A4A4A",
    borderRadius: 8,
    height: "100%",
  },
  thumb: {
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    height: 22,
    marginLeft: -11,
    marginTop: -3.5,
    position: "absolute",
    top: 0,
    width: 22,
  },
  hitRow: {
    bottom: -16,
    flexDirection: "row",
    left: 0,
    position: "absolute",
    right: 0,
    top: -16,
  },
  segment: {
    flex: 1,
  },
});
