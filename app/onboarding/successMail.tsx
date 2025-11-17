import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
  FadeOutDown,
  FadeInDown,
} from 'react-native-reanimated';



export default function SuccessMail() {
  const router = useRouter();
  const LottieView = require('lottie-react-native').default;
  const { colors, theme } = useTheme();

  return (
    <View style={styles.container}>



      <Animated.View
        style={styles.header}
        entering={FadeInUp.delay(1500).duration(600)}>
        <Text style={[styles.title, { color: colors.text }]}>
          Félicitations
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Ton email a bien été vérifié
        </Text>
      </Animated.View>



      <View style={styles.animationContainer}>
        <LottieView
          source={require('../../assets/animations/successMail.json')}
          autoPlay
          loop={false}
          style={styles.lottieAnimation}
        />
      </View>


      <Animated.View
        entering={FadeInUp.delay(1000).duration(600)}
        style={styles.message}
      >
        <Text style={{ fontSize: 20, fontWeight:300 }}>Tu peux maintenant</Text>
        <Text style={{ fontSize: 20, fontWeight:300 }}>te <Text style={{ fontWeight: 700, fontSize:20 }}>connecter</Text></Text>
        <Text style={{ fontSize: 20, fontWeight:300 }}>🎉</Text>
      </Animated.View>


      <Animated.View
        style={{ position: 'absolute', bottom: 40, width: '100%' }}
        entering={FadeInDown.delay(1500).duration(600)}>
        <TouchableOpacity
          style={[styles.validateButton, { backgroundColor: colors.actionButton }]}
          onPress={() => router.push('/onboarding/login')}
        >
          <Text style={[styles.validateButtonText, { color: colors.buttonText }]}>
            Se connecter
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 80,
    left: 20,
    alignItems: 'center',
  },

  title: {
    fontSize: 55,
    fontFamily: 'Satoshi-Black',
  },

  subtitle: {
    fontSize: 26,
    marginLeft: -2,
    marginTop: -10,
    fontFamily: 'Satoshi-Regular',
    opacity: 0.7,
  },


  message: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: 'Satoshi-Regular',
    gap: 6,
    marginTop: 250,
  },

  validateButton: {
    height: 70,
    width: '77%',
    borderRadius: 100,
    position: "absolute",
    bottom: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: 'center',
  },
  validateButtonText: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Satoshi-Bold",
  },
});
