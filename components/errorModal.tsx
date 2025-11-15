import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

interface ErrorModalProps {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export default function ErrorModal({ visible, title, content, onClose }: ErrorModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={ZoomIn.springify()}
          exiting={ZoomOut.springify()}
          style={styles.container}
        >
          <View style={[styles.modal, { backgroundColor: "#b24c4cff", borderColor: "#993c3cff", borderWidth: 1 }]}>
            {/* Title */}
            <Text style={[styles.title, { color: "white" }]}>
              {title}
            </Text>

            {/* Content */}
            <Text style={[styles.content, { color: "white" }]}>
              {content}
            </Text>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "white" }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: "black" }]}>
                Compris
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: '85%',
      maxWidth: 350,
    },
    modal: {
      borderRadius: 16,
      padding: 20,
      alignItems: 'flex-start',
      gap: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
    },
    content: {
      fontSize: 16,
      fontWeight: '200',
      textAlign: 'center',
      lineHeight: 20,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignSelf: 'flex-end',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      minWidth: 120,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
