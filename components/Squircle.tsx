import { SquircleView } from "expo-squircle-view";
import { ComponentProps, ReactNode } from "react";
import Animated from "react-native-reanimated";

type SquircleProps = ComponentProps<typeof SquircleView> & {
    children?: ReactNode;
}

export default function Squircle({ children, ...props }: SquircleProps) {
    const AnimatedSquircle = Animated.createAnimatedComponent(SquircleView);

    return (
        <AnimatedSquircle
            {...props}
            cornerSmoothing={100}
            preserveSmoothing={true}
        >
            {children}
        </AnimatedSquircle>
    );
}