import { Host } from "@expo/ui";
import { Button, Menu, RNHostView } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

type OnboardingLogoutMenuProps = {
  label: string;
  onLogoutPress: () => void;
};

export default function OnboardingLogoutMenu({
  label,
  onLogoutPress,
}: OnboardingLogoutMenuProps) {
  return (
    <Host matchContents ignoreSafeArea="all">
      <Menu
        label={
          <RNHostView matchContents>
            <View style={styles.trigger}>
              <SymbolView
                name="ellipsis"
                size={24}
                tintColor="#151515"
                weight="bold"
                style={styles.icon}
              />
            </View>
          </RNHostView>
        }
      >
        <Button
          label={label}
          onPress={onLogoutPress}
          role="destructive"
          systemImage="rectangle.portrait.and.arrow.right"
        />
      </Menu>
    </Host>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  icon: {
    transform: [{ rotate: "90deg" }],
  },
});
