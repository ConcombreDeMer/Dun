import { View } from "react-native";

interface TaskIndicatorProps {
  type: 1 | 2 | 3;
}

export default function TaskIndicator({ type }: TaskIndicatorProps) {
    // type 1: pas de tâches
    // type 2: tâches en cours
    // type 3: toutes les tâches complétées

    return (
        <View style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: type === 1 ? 'transparent' : type === 2 ? '#FFAB00' : '#00C851',
        }} />
    );
}