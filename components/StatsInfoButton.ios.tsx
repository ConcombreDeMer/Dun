import { Host } from "@expo/ui";
import { Button } from "@expo/ui/swift-ui";
import { buttonStyle, containerShape, controlSize, frame, labelStyle, shapes } from "@expo/ui/swift-ui/modifiers";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

type StatsInfoButtonProps = {
  onPress: () => void;
};

export default memo(function StatsInfoButton({ onPress }: StatsInfoButtonProps) {
  return (
    <View style={styles.container}>
      <Host matchContents ignoreSafeArea="all">
        <Button
          label="Options"
          systemImage="slider.horizontal.3"
          onPress={onPress}
          modifiers={[
            buttonStyle("glass"),
            controlSize("extraLarge"),
            containerShape(shapes.circle()),
            frame({ width: 48, height: 48 }),
            labelStyle("iconOnly"),
          ]}
        />
      </Host>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
});
