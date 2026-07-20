import { Modal, StyleSheet, TextInput, View } from "react-native";
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
  onSubmit,
  placeholder,
}: OnboardingNameSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Squircle style={styles.inputSurface}>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            onChangeText={onChangeName}
            onSubmitEditing={onSubmit}
            placeholder={placeholder}
            placeholderTextColor="#B8B8B8"
            returnKeyType="done"
            style={styles.input}
            value={name}
          />
        </Squircle>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 16,
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
