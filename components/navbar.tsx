import { View, Pressable, ImageBackground, Animated } from "react-native";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import { getImageSource } from "../lib/imageHelper";
import { useTheme } from "../lib/ThemeContext";
import { router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";

export default function Navbar() {
    const { colors, theme } = useTheme();
    const pathname = usePathname();
    const slideAnim = useRef(new Animated.Value(0)).current;

    const getTabIndex = () => {
        if (pathname === "/stats") return 1;
        if (pathname === "/settings") return 2;
        if (pathname === "/create-task") return 3;
        return 0; // home
    };

    useEffect(() => {
        const tabIndex = getTabIndex();
        Animated.spring(slideAnim, {
            toValue: tabIndex * 65,
            useNativeDriver: true,
            speed: 8,
        }).start();
    }, [pathname]);



    return (
        <View style={styles.container}
        >
            <ImageBackground
                source={require("../assets/images/background/bg.jpg")}
                style={styles.bg}
            >
            </ImageBackground>

            <Animated.View
                style={[
                    styles.slidingCircle,
                    {
                        transform: [{
                            translateX: slideAnim,
                        }],
                    },
                ]}
            />
            <Pressable style={styles.iconContainer}
                onPress={() => router.push("/")}
            >
                <Image
                    style={{ width: 29, aspectRatio: 1 }}
                    source={getImageSource("home", theme)}
                ></Image>
            </Pressable>
            <Pressable
                style={styles.iconContainer}
                onPress={() => router.push("/stats")}
            >
                <Image
                    style={{ width: 29, aspectRatio: 1 }}
                    source={getImageSource("profile", theme)}
                ></Image>
            </Pressable>
            <Pressable
                style={styles.iconContainer}
                onPress={() => router.push("/settings")}
            >
                <Image
                    style={{ width: 29, aspectRatio: 1 }}
                    source={getImageSource("settings", theme)}
                ></Image>
            </Pressable>
            <Pressable
                style={styles.iconContainer}
                onPress={() => router.push("/create-task")}
            >
                <Image
                    style={{ width: 29, aspectRatio: 1 }}
                    source={getImageSource("add", theme)}
                ></Image>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 48,
        width: "60%",
        position: "absolute",
        bottom: 40,
        borderRadius: 100,
        alignSelf: "center",
        zIndex: 100,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        overflow: "hidden",
    },
    bg: {
        width: '120%',
        height: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        position: "absolute",
        top: 0, right: 0,
        zIndex: -1,
    },
    slidingCircle: {
        position: "absolute",
        width: 48,
        height: 48,
        borderRadius: 100,
        backgroundColor: "red",
        top: "0%",
        left: "0%",
    },
    iconContainer: {
        zIndex: 3,
        // backgroundColor: "blue",
        borderRadius: 999,
        padding: 8,
    },
});