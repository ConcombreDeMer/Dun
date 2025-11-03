import { useRouter } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function Details() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>LES DETAILS.</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
        <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
}