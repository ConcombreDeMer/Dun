import { Host } from "@expo/ui";
import { Slider } from "@expo/ui/swift-ui";
import { Animation, animation, tint } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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
  const lastHapticIndexRef = useRef(selectedIndex);
  const [sliderValue, setSliderValue] = useState(selectedIndex);
  const displayIndex = Math.max(0, Math.min(options.length - 1, Math.round(sliderValue)));

  useEffect(() => {
    setSliderValue(selectedIndex);
    lastHapticIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const handleValueChange = (value: number) => {
    const nextIndex = Math.max(0, Math.min(options.length - 1, Math.round(value)));
    setSliderValue(value);

    if (nextIndex !== lastHapticIndexRef.current) {
      lastHapticIndexRef.current = nextIndex;
      void Haptics.selectionAsync();
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.value}>{options[displayIndex]}</Text>
      <Host style={styles.host}>
        <Slider
          max={options.length - 1}
          min={0}
          modifiers={[tint("#050505"), animation(Animation.easeOut({ duration: 0.22 }), sliderValue)]}
          onEditingChanged={(isEditing) => {
            if (!isEditing) {
              const nextIndex = Math.max(0, Math.min(options.length - 1, Math.round(sliderValue)));
              setSliderValue(nextIndex);
              if (nextIndex !== selectedIndex) {
                onChange(nextIndex);
              }
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          onValueChange={handleValueChange}
          value={sliderValue}
        />
      </Host>
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
    marginBottom: 20,
  },
  host: {
    height: 42,
    width: "100%",
  },
});
