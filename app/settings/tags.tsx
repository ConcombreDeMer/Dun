import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SecondaryButton from "@/components/secondaryButton";
import SimpleInput from "@/components/textInput";
import Squircle from "@/components/Squircle";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useSubscription } from "@/lib/subscription";
import { createTag, deleteTag, getTags, Tag, TAGS_QUERY_KEY, TAG_USAGE_STATS_QUERY_KEY, updateTag } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import { BottomSheet, Button as SwiftButton, Group, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { presentationDetents, presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const TAG_COLORS = ["#4F8EF7", "#62B36F", "#F05D5E", "#F6A23D", "#8B6FF6", "#3A3A3A"];
const FREE_TAG_LIMIT = 2;

export default function TagsSettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const { isPremium } = useSubscription();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const isEditing = !!editingTag;

  const { data: tags = [], isLoading } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: getTags,
  });
  const isTagLimitReached = !isPremium && tags.length >= FREE_TAG_LIMIT;

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TAG_USAGE_STATS_QUERY_KEY });
      closeSheet();
    },
    onError: (error: any) => {
      Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: updateTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TAG_USAGE_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeSheet();
    },
    onError: (error: any) => {
      Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TAG_USAGE_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: any) => {
      Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
    },
  });

  const closeSheet = () => {
    setIsSheetOpen(false);
    setEditingTag(null);
    setName("");
    setSelectedColor(TAG_COLORS[0]);
  };

  const openCreateSheet = () => {
    if (isTagLimitReached) {
      router.push("/settings/premium");
      return;
    }

    setEditingTag(null);
    setName("");
    setSelectedColor(TAG_COLORS[0]);
    setIsSheetOpen(true);
  };

  const openEditSheet = async (tag: Tag) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTag(tag);
    setName(tag.name);
    setSelectedColor(tag.color);
    setIsSheetOpen(true);
  };

  const confirmDeleteTag = async (tag: Tag) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      t("tags.delete.title"),
      t("tags.delete.message", { name: tag.name }),
      [
        {
          text: t("common.actions.cancel"),
          style: "cancel",
        },
        {
          text: t("common.actions.delete"),
          style: "destructive",
          onPress: () => deleteTagMutation.mutate(tag.id),
        },
      ]
    );
  };

  const handleSubmitTag = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!name.trim()) {
      Alert.alert(t("common.alerts.errorTitle"), t("tags.alerts.requiredName"));
      return;
    }

    if (!editingTag && isTagLimitReached) {
      router.push("/settings/premium");
      return;
    }

    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, name, color: selectedColor });
      return;
    }

    createTagMutation.mutate({ name, color: selectedColor });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SecondaryButton
          onPress={() => router.back()}
          image="chevron.left"
        />
        <Headline
          title={t("tags.headline.title")}
          subtitle={t("tags.headline.subtitle")}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSizes.lg }]}>
            {t("common.status.loading")}
          </Text>
        )}

        {!isLoading && tags.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SymbolView name="tag" size={34} tintColor={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
              {t("tags.empty.title")}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSizes.base }]}>
              {t("tags.empty.description")}
            </Text>
          </View>
        )}

        {tags.map((tag) => (
          <Squircle
            key={tag.id}
            style={[styles.tagRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.tagInfo}>
              <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
              <Text style={[styles.tagName, { color: colors.text, fontSize: fontSizes.lg }]}>
                {tag.name}
              </Text>
            </View>

            <Host matchContents style={styles.menuHost}>
              <Menu
                label={
                  <RNHostView matchContents>
                    <View style={[styles.menuButton, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <SymbolView name="ellipsis" size={18} tintColor={colors.text} />
                    </View>
                  </RNHostView>
                }
              >
                <SwiftButton
                  label={t("common.actions.edit")}
                  systemImage="pencil"
                  onPress={() => openEditSheet(tag)}
                />
                <SwiftButton
                  label={t("common.actions.delete")}
                  systemImage="trash"
                  role="destructive"
                  onPress={() => confirmDeleteTag(tag)}
                />
              </Menu>
            </Host>
          </Squircle>
        ))}

        {!isLoading ? (
          <View style={styles.limitSection}>
            <View style={styles.limitHeader}>
              <Text style={[styles.limitLabel, { color: colors.text, fontSize: fontSizes.base }]}>
                {isPremium
                  ? t("tags.limit.premium")
                  : t("tags.limit.counter", { count: Math.min(tags.length, FREE_TAG_LIMIT), limit: FREE_TAG_LIMIT })}
              </Text>
              {!isPremium ? (
                <View style={[styles.limitBadge, { backgroundColor: isTagLimitReached ? "#F4BA00" : colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.limitBadgeText, { color: isTagLimitReached ? "#2C2405" : colors.textSecondary, fontSize: fontSizes.sm }]}>
                    {tags.length}/{FREE_TAG_LIMIT}
                  </Text>
                </View>
              ) : null}
            </View>

            {!isPremium ? (
              <View style={[styles.limitTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.limitTrackFill,
                    {
                      backgroundColor: isTagLimitReached ? "#F4BA00" : colors.text,
                      width: `${Math.min(100, (tags.length / FREE_TAG_LIMIT) * 100)}%`,
                    },
                  ]}
                />
              </View>
            ) : null}

            {isTagLimitReached ? (
              <View style={[styles.limitNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.limitNoticeIcon}>
                  <SymbolView name="plus" size={15} weight="bold" tintColor="#2C2405" />
                </View>
                <View style={styles.limitNoticeText}>
                  <Text style={[styles.limitNoticeTitle, { color: colors.text, fontSize: fontSizes.lg }]}>
                    {t("tags.limit.reachedTitle")}
                  </Text>
                  <Text style={[styles.limitNoticeDescription, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
                    {t("tags.limit.reachedDescription", { limit: FREE_TAG_LIMIT })}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/settings/premium")}
                  style={[styles.unlockButton, { backgroundColor: colors.text }]}
                >
                  <Text style={[styles.unlockButtonText, { color: colors.background, fontSize: fontSizes.sm }]}>
                    {t("common.actions.unlock")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <PrimaryButton
        image="plus"
        onPress={openCreateSheet}
        disabled={isTagLimitReached}
        size="XS"
        style={styles.addButton}
      />

      {isSheetOpen && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Host style={styles.host}>
            <BottomSheet
              isPresented={isSheetOpen}
              onIsPresentedChange={(presented) => {
                if (!presented) {
                  closeSheet();
                }
              }}
              fitToContents
            >
              <Group modifiers={[presentationDragIndicator("visible"), presentationDetents([{ height: 330 }, "medium"])]}>
                <RNHostView matchContents>
                  <View style={[styles.sheet]}>
                    <Text style={[styles.sheetTitle, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
                      {isEditing ? t("tags.form.editTitle") : t("tags.form.title")}
                    </Text>

                    <SimpleInput
                      name={t("tags.form.name")}
                      value={name}
                      onChangeText={setName}
                      maxLength={24}
                      returnKeyType="done"
                    />

                    <View style={styles.colorGrid}>
                      {TAG_COLORS.map((color) => {
                        const isSelected = selectedColor === color;

                        return (
                          <Pressable
                            key={color}
                            onPress={() => setSelectedColor(color)}
                            style={[
                              styles.colorOption,
                              {
                                backgroundColor: color,
                                borderColor: isSelected ? colors.text : colors.border,
                                borderWidth: isSelected ? 3 : 1,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>

                    <PrimaryButton
                      title={isEditing ? t("common.actions.edit") : t("common.actions.create")}
                      onPress={handleSubmitTag}
                      disabled={createTagMutation.isPending || updateTagMutation.isPending}
                    />
                  </View>
                </RNHostView>
              </Group>
            </BottomSheet>
          </Host>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  content: {
    gap: 10,
    paddingBottom: 120,
  },
  empty: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  emptyTitle: {
    fontFamily: "Satoshi-Bold",
  },
  emptyText: {
    fontFamily: "Satoshi-Medium",
    textAlign: "center",
  },
  tagRow: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingLeft: 18,
    paddingRight: 12,
  },
  tagInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 14,
    minWidth: 0,
  },
  tagColor: {
    borderRadius: 999,
    height: 18,
    width: 18,
  },
  tagName: {
    flex: 1,
    fontFamily: "Satoshi-Medium",
  },
  limitSection: {
    gap: 10,
    marginTop: 10,
  },
  limitHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  limitLabel: {
    fontFamily: "Satoshi-Bold",
  },
  limitBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 46,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  limitBadgeText: {
    fontFamily: "Satoshi-Bold",
  },
  limitTrack: {
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
  },
  limitTrackFill: {
    borderRadius: 999,
    height: "100%",
  },
  limitNotice: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  limitNoticeIcon: {
    alignItems: "center",
    backgroundColor: "#F4BA00",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  limitNoticeText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  limitNoticeTitle: {
    fontFamily: "Satoshi-Bold",
  },
  limitNoticeDescription: {
    fontFamily: "Satoshi-Regular",
    lineHeight: 18,
  },
  unlockButton: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  unlockButtonText: {
    fontFamily: "Satoshi-Bold",
  },
  menuHost: {
    height: 38,
    width: 38,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  addButton: {
    bottom: 32,
    position: "absolute",
    right: 24,
  },
  host: {
    flex: 1,
  },
  sheet: {
    gap: 18,
    paddingHorizontal: 24,
    paddingTop: 34,
    width: "100%",
  },
  sheetTitle: {
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },
  colorGrid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  colorOption: {
    borderRadius: 999,
    height: 36,
    width: 36,
  },
});
