import { BottomSheet, Group, Host, RNHostView } from "@expo/ui/swift-ui";
import { presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, TextInput, View } from "react-native";
import Squircle from "../Squircle";

type OnboardingNameSheetProps = {
  isVisible: boolean;
  name: string;
  onChangeName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  placeholder: string;
};

export default function OnboardingNameSheet({
  isVisible,
  name,
  onChangeName,
  onClose,
  placeholder,
}: OnboardingNameSheetProps) {
  const inputRef = useRef<TextInput>(null);
  const [isPresented, setIsPresented] = useState(isVisible);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setIsPresented(true);
    const focusFrame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(focusFrame);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <Host style={styles.host}>
      <BottomSheet
        fitToContents
        isPresented={isPresented}
        onDismiss={onClose}
        onIsPresentedChange={(presented) => {
          if (!presented) {
            setIsPresented(false);
          }
        }}
      >
        <Group modifiers={[presentationDragIndicator("visible")]}>
          <RNHostView matchContents>
            <View style={styles.sheetContent}>
              <Squircle style={styles.inputSurface}>
                <TextInput
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  enterKeyHint="done"
                  onChangeText={onChangeName}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    setIsPresented(false);
                  }}
                  placeholder={placeholder}
                  placeholderTextColor="#B8B8B8"
                  ref={inputRef}
                  returnKeyType="done"
                  style={styles.input}
                  value={name}
                />
              </Squircle>
            </View>
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    bottom: 0,
    left: 0,
    pointerEvents: "box-none",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 40,
  },
  sheetContent: {
    paddingBottom: 30,
    paddingTop: 24,
  },
  inputSurface: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E4E4",
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 18,
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  input: {
    color: "#111111",
    flex: 1,
    fontFamily: "Inter_24pt-SemiBold",
    fontSize: 22,
    minHeight: 54,
    padding: 0,
    textAlign: "center",
  },
});
