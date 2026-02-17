import { View } from "react-native";

const LottieView = require("lottie-react-native").default;

export default function Loading() {


    return (
        <View
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 10 }}
        >
            <LottieView
                source={require("../assets/animations/loading.json")}
                autoPlay
                loop={true}
                style={styles.lottieAnimation}
            />
        </View>
    )
}

const styles = {
    lottieAnimation: {
        width: 150,
        height: 150,
    },
};