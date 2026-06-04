/* eslint-disable react-hooks/immutability */
import { FontContext } from "@/lib/FontContext";
import { useOptimisticTaskMutations } from "@/lib/useOptimisticTaskMutations";
import { useStore } from "@/store/store";
import { BottomSheet, Group, Host, RNHostView } from "@expo/ui/swift-ui";
import { presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SquircleView } from "expo-squircle-view";
import { SymbolView } from "expo-symbols";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ReAnimated, {
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { toAppDateKey } from "../lib/date";
import { useAppTranslation } from "../lib/i18n";
import { useTheme } from "../lib/ThemeContext";
import TagSelector from "./TagSelector";

interface LiquidCreateModalProps {
  accessoryId?: string;
  onClose?: () => void;
}

type CreateButtonState = "idle" | "loading" | "success";

export default function LiquidCreateModal({ onClose }: LiquidCreateModalProps) {
  const [isPresented, setIsPresented] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [createButtonState, setCreateButtonState] = useState<CreateButtonState>("idle");
  const inputRef = useRef<TextInput>(null);
  const [contentEntrance] = useState(() => new Animated.Value(0));
  const createButtonScale = useSharedValue(1);
  const createButtonWidth = useSharedValue(112);
  const createLoadingProgress = useSharedValue(0);
  const createSuccessProgress = useSharedValue(0);
  const isCreatingTaskRef = useRef(false);
  const didRequestCloseRef = useRef(false);
  const didNotifyCloseRef = useRef(false);
  const hasFocusedInputRef = useRef(false);
  const shouldOpenDetailsAfterDismissRef = useRef(false);
  const successResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { colors } = useTheme();
  const { fontSizes } = React.useContext(FontContext)!;
  const { t } = useAppTranslation();
  const { createTaskOptimistically } = useOptimisticTaskMutations();
  const selectedDate = useStore((state) => state.selectedDate) || new Date();
  const selectedDateKey = toAppDateKey(selectedDate);

  const requestClose = React.useCallback(() => {
    if (didRequestCloseRef.current) {
      return;
    }

    didRequestCloseRef.current = true;
    setIsPresented(false);
  }, []);

  useEffect(() => {
    Animated.timing(contentEntrance, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    const focusFrame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(focusFrame);
  }, [contentEntrance]);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardWillHide", () => {
      if (!hasFocusedInputRef.current || isCreatingTaskRef.current || didNotifyCloseRef.current) {
        return;
      }

      requestClose();
    });

    return () => subscription.remove();
  }, [requestClose]);

  useEffect(() => {
    return () => {
      if (successResetTimerRef.current) {
        clearTimeout(successResetTimerRef.current);
      }
    };
  }, []);

  const notifyClosed = () => {
    if (didNotifyCloseRef.current) {
      return;
    }

    didNotifyCloseRef.current = true;
    onClose?.();

    if (shouldOpenDetailsAfterDismissRef.current) {
      requestAnimationFrame(() => {
        router.push("/create-task");
      });
    }
  };

  const createButtonShellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createButtonScale.value }],
    width: createButtonWidth.value,
  }));

  const createSuccessOverlayStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - createSuccessProgress.value) * 44,
      },
    ],
  }));

  const createDefaultContentStyle = useAnimatedStyle(() => ({
    opacity:
      createLoadingProgress.value > 0
        ? 0
        : createSuccessProgress.value < 0.45
          ? 1 - createSuccessProgress.value / 0.45
          : 0,
    transform: [{ translateY: -8 * createSuccessProgress.value }],
  }));

  const createLoadingContentStyle = useAnimatedStyle(() => ({
    opacity:
      createSuccessProgress.value > 0
        ? 0
        : createLoadingProgress.value,
    transform: [{ translateY: 6 * (1 - createLoadingProgress.value) }],
  }));

  const createSuccessContentStyle = useAnimatedStyle(() => ({
    opacity:
      createSuccessProgress.value < 0.45
        ? 0
        : (createSuccessProgress.value - 0.45) / 0.55,
    transform: [{ translateY: 8 * (1 - createSuccessProgress.value) }],
  }));

  const pressCreateButton = () => {
    createButtonScale.value = withSpring(0.96, {
      damping: 18,
      stiffness: 420,
    });
  };

  const releaseCreateButton = () => {
    createButtonScale.value = withSpring(1, {
      damping: 14,
      stiffness: 360,
    });
  };

  const playCreateSuccessAnimation = () => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
    }

    createLoadingProgress.value = withTiming(0, {
      duration: 140,
      easing: ReanimatedEasing.out(ReanimatedEasing.quad),
    });
    createButtonScale.value = withSpring(1, {
      damping: 14,
      stiffness: 360,
    });
    createButtonWidth.value = withTiming(166, {
      duration: 240,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
    });
    createSuccessProgress.value = withTiming(1, {
      duration: 260,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
    });

    successResetTimerRef.current = setTimeout(() => {
      setCreateButtonState("idle");
      createButtonWidth.value = withTiming(112, {
        duration: 220,
        easing: ReanimatedEasing.inOut(ReanimatedEasing.cubic),
      });
      createSuccessProgress.value = withTiming(0, {
        duration: 220,
        easing: ReanimatedEasing.inOut(ReanimatedEasing.cubic),
      });
    }, 1000);
  };

  const playCreateLoadingAnimation = () => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
    }

    setCreateButtonState("loading");
    createSuccessProgress.value = withTiming(0, {
      duration: 120,
      easing: ReanimatedEasing.out(ReanimatedEasing.quad),
    });
    createLoadingProgress.value = withTiming(1, {
      duration: 140,
      easing: ReanimatedEasing.out(ReanimatedEasing.quad),
    });
  };

  const resetCreateButtonAnimation = () => {
    setCreateButtonState("idle");
    createLoadingProgress.value = withTiming(0, {
      duration: 120,
      easing: ReanimatedEasing.out(ReanimatedEasing.quad),
    });
    createSuccessProgress.value = withTiming(0, {
      duration: 120,
      easing: ReanimatedEasing.out(ReanimatedEasing.quad),
    });
    createButtonWidth.value = withTiming(112, {
      duration: 180,
      easing: ReanimatedEasing.inOut(ReanimatedEasing.cubic),
    });
  };

  const handleCreateTask = () => {
    if (createButtonState !== "idle") {
      return;
    }

    if (!taskTitle.trim()) {
      Alert.alert(t("common.alerts.errorTitle"), t("common.alerts.requiredTaskName"));
      inputRef.current?.focus();
      return;
    }

    isCreatingTaskRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextTitle = taskTitle;
    const nextTagIds = selectedTagIds;
    playCreateLoadingAnimation();
    setTaskTitle("");
    setSelectedTagIds([]);

    void createTaskOptimistically({
      name: nextTitle,
      dateKey: selectedDateKey,
      tagIds: nextTagIds,
    }).then(() => {
      setCreateButtonState("success");
      playCreateSuccessAnimation();
    }).catch((error: any) => {
      console.error("Erreur lors de la création de la tâche:", error);
      resetCreateButtonAnimation();
      setTaskTitle((current) => (current.trim() ? current : nextTitle));
      setSelectedTagIds((current) => (current.length ? current : nextTagIds));
      Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
    });

    setTimeout(() => {
      inputRef.current?.focus();
      isCreatingTaskRef.current = false;
    }, 80);
  };

  const openPage = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    shouldOpenDetailsAfterDismissRef.current = true;
    requestClose();
  };

  return (
    <Host style={styles.host}>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={notifyClosed}
        onIsPresentedChange={(nextIsPresented) => {
          if (!nextIsPresented) {
            requestClose();
          }
        }}
        fitToContents
      >
        <Group modifiers={[presentationDragIndicator("visible")]}>
          <RNHostView matchContents>
            <Animated.View
              style={[
                styles.sheetContent,
                {
                  opacity: contentEntrance,
                  transform: [
                    {
                      translateY: contentEntrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* <View style={styles.header}>
                <Text style={[styles.eyebrow, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
                  {selectedDateKey}
                </Text>
                <SquircleView
                  cornerSmoothing={100}
                  preserveSmoothing
                  style={[styles.closeSurface, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.actions.cancel")}
                    hitSlop={8}
                    onPress={requestClose}
                    style={styles.iconButton}
                  >
                    <SymbolView name="xmark" size={14} tintColor={colors.textSecondary} />
                  </Pressable>
                </SquircleView>
              </View> */}

              <SquircleView
                cornerSmoothing={100}
                preserveSmoothing
                style={[styles.inputSurface, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <TextInput
                  ref={inputRef}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  autoFocus
                  blurOnSubmit={false}
                  onChangeText={setTaskTitle}
                  onFocus={() => {
                    hasFocusedInputRef.current = true;
                  }}
                  onSubmitEditing={handleCreateTask}
                  placeholder={t("createModal.titlePlaceholder")}
                  placeholderTextColor={colors.inputPlaceholder}
                  returnKeyType="done"
                  style={[styles.input, { color: colors.text, fontSize: fontSizes["2xl"] }]}
                  value={taskTitle}
                />
              </SquircleView>

              <View style={styles.tagsSection}>
                <TagSelector
                  compact
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </View>

              <View style={styles.footer}>
                <SquircleView
                  cornerSmoothing={100}
                  preserveSmoothing
                  style={[styles.secondarySurface, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Pressable accessibilityRole="button" onPress={openPage} style={styles.secondaryAction}>
                    <SymbolView name="text.page" size={19} tintColor={colors.textSecondary} />
                  </Pressable>
                </SquircleView>

                <ReAnimated.View style={[styles.createActionShell, createButtonShellStyle]}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={createButtonState !== "idle"}
                    onPress={handleCreateTask}
                    onPressIn={pressCreateButton}
                    onPressOut={releaseCreateButton}
                    style={styles.createAction}
                  >
                    <LinearGradient
                      colors={["#484848", "#171717"]}
                      end={{ x: 1, y: 1 }}
                      start={{ x: 0, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <ReAnimated.View
                      style={[
                        styles.createSuccessOverlay,
                        createSuccessOverlayStyle,
                        {
                          backgroundColor: "#4F8F55",
                        },
                      ]}
                    />
                    <ReAnimated.View
                      style={[
                        styles.createContent,
                        styles.createDefaultContent,
                        createDefaultContentStyle,
                      ]}
                    >
                      <Text style={[styles.createText, { color: colors.buttonText, fontSize: fontSizes.base }]}>
                        {t("common.actions.create")}
                      </Text>
                      <SymbolView name="plus" size={18} tintColor={colors.buttonText} />
                    </ReAnimated.View>
                    <ReAnimated.View
                      style={[
                        styles.createContent,
                        styles.createDefaultContent,
                        createLoadingContentStyle,
                      ]}
                    >
                      <ActivityIndicator color={colors.buttonText} size="small" />
                    </ReAnimated.View>
                    <ReAnimated.View
                      style={[
                        styles.createContent,
                        styles.createSuccessContent,
                        createSuccessContentStyle,
                      ]}
                    >
                      <Text style={[styles.createText, { color: colors.buttonText, fontSize: fontSizes.base }]}>
                        {t("createModal.created")}
                      </Text>
                      <SymbolView name="checkmark" size={18} tintColor={colors.buttonText} />
                    </ReAnimated.View>
                  </Pressable>
                </ReAnimated.View>
              </View>
            </Animated.View>
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
    position: "absolute",
    right: 0,
    top: 0,
    pointerEvents: "box-none",
    zIndex: 30,
  },
  sheetContent: {
    gap: 14,
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: "Satoshi-Medium",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  closeSurface: {
    borderRadius: 18,
    borderWidth: 1,
  },
  iconButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  inputSurface: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Satoshi-Regular",
    minHeight: 54,
    padding: 0,
  },
  tagsSection: {
    paddingHorizontal: 2,
    alignSelf: "center"
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondarySurface: {
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryAction: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 46,
  },
  createActionShell: {
    height: 42,
  },
  createAction: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  createSuccessOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  createContent: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    position: "absolute",
    top: 0,
  },
  createDefaultContent: {
    left: 0,
    width: 112,
  },
  createSuccessContent: {
    right: 0,
    width: 166,
  },
  createText: {
    fontFamily: "Satoshi-Medium",
  },
});
