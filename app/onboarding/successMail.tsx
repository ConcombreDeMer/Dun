import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function SuccessMail() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>gg</Text>
      <TouchableOpacity
        style={{
          marginTop: 20,
          paddingVertical: 12,
          paddingHorizontal: 30,
          backgroundColor: '#007AFF',
          borderRadius: 8,
        }}
        onPress={() => router.push('/')}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
          Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
