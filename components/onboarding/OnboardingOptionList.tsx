import { TaskItem } from "@/components/TaskItem";
import * as Haptics from "expo-haptics";
import { StyleSheet, View } from "react-native";

type OnboardingOptionListProps = {
  options: string[];
  selected: string[];
  mode: "single" | "multiple";
  onChange: (options: string[]) => void;
};

export default function OnboardingOptionList({
  options,
  selected,
  mode,
  onChange,
}: OnboardingOptionListProps) {
  const handleToggle = (option: string) => {
    void Haptics.selectionAsync();

    if (mode === "single") {
      onChange(selected.includes(option) ? [] : [option]);
      return;
    }

    onChange(
      selected.includes(option)
        ? selected.filter((selectedOption) => selectedOption !== option)
        : [...selected, option]
    );
  };

  return (
    <View style={styles.list}>
      {options.map((option, index) => (
        <View key={option} style={styles.item}>
          <TaskItem
            disableSwipe
            disableAddedAnimations
            drag={() => {}}
            handleTaskPress={() => {}}
            handleToggleTask={() => handleToggle(option)}
            isActive={false}
            isExtendable={false}
            item={{
              id: index + 1,
              name: option,
              done: selected.includes(option),
              description: "",
            }}
            layoutAnimationKey={selected.join("|")}
            listHeight={options.length * 64}
            onPressWhenNotExtendable={() => handleToggle(option)}
            selectedTaskId={null}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 9,
    width: "100%",
  },
  item: {
    minHeight: 64,
  },
});
