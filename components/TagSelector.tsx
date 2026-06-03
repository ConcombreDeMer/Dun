import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { getTags, MAX_TAGS_PER_TASK, TAGS_QUERY_KEY, Tag } from "@/lib/tags";
import { useTheme } from "@/lib/ThemeContext";
import { Button as SwiftButton, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

type TagSelectorProps = {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  compact?: boolean;
  mode?: "all" | "selectedMenu";
};

function TagChip({
  compact,
  isExiting = false,
  isSelected,
  onPress,
  tag,
}: {
  compact?: boolean;
  isExiting?: boolean;
  isSelected: boolean;
  onPress: () => void;
  tag: Tag;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(0));
  const { colors } = useTheme();
  const { fontSizes } = useFont();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isExiting ? 0 : 1,
        duration: isExiting ? 130 : 160,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: isExiting ? 0.86 : isSelected ? 1.04 : 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExiting, isSelected, opacity, scale]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        disabled={isExiting}
        style={[
          styles.chip,
          compact && styles.compactChip,
          {
            backgroundColor: isSelected ? tag.color : colors.card,
            borderColor: isSelected ? tag.color : colors.border,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.chipText,
            {
              color: isSelected ? "#FFFFFF" : colors.text,
              fontSize: compact ? fontSizes.sm : fontSizes.base,
            },
          ]}
        >
          {tag.name}
        </Text>
        {isSelected ? (
          <View style={[styles.dot, styles.selectedDot, { backgroundColor: "#FFFFFF" }]}>
            <SymbolView
              name="xmark"
              size={9}
              tintColor={tag.color}
            />
          </View>
        ) : (
          <View style={[styles.dot, { backgroundColor: tag.color }]} />
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function TagSelector({ compact = false, mode = "all", selectedTagIds, onChange }: TagSelectorProps) {
  const { colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const { data: tags = [] } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: getTags,
  });
  const [exitingTagIds, setExitingTagIds] = useState<string[]>([]);
  const [visibleSelectedTagIds, setVisibleSelectedTagIds] = useState(selectedTagIds);

  useEffect(() => {
    if (mode !== "selectedMenu") {
      const timer = setTimeout(() => {
        setVisibleSelectedTagIds(selectedTagIds);
        setExitingTagIds([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const removedTagIds = visibleSelectedTagIds.filter((tagId) => !selectedTagIds.includes(tagId));
    const addedTagIds = selectedTagIds.filter((tagId) => !visibleSelectedTagIds.includes(tagId));

    if (!removedTagIds.length) {
      if (addedTagIds.length) {
        const timer = setTimeout(() => {
          setVisibleSelectedTagIds((current) => [...current, ...addedTagIds]);
        }, 0);
        return () => clearTimeout(timer);
      }
      return;
    }

    const exitTimer = setTimeout(() => {
      setExitingTagIds((current) => Array.from(new Set([...current, ...removedTagIds])));
    }, 0);

    const timer = setTimeout(() => {
      setVisibleSelectedTagIds(selectedTagIds);
      setExitingTagIds((current) => current.filter((tagId) => !removedTagIds.includes(tagId)));
    }, 150);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(timer);
    };
  }, [mode, selectedTagIds, visibleSelectedTagIds]);

  if (!tags.length) {
    return null;
  }

  const displayedSelectedTagIds = mode === "selectedMenu" ? visibleSelectedTagIds : selectedTagIds;
  const selectedTags = displayedSelectedTagIds
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is Tag => !!tag);
  const availableTags = tags.filter((tag) => !selectedTagIds.includes(tag.id));

  const toggleTag = async (tagId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
      return;
    }

    if (selectedTagIds.length >= MAX_TAGS_PER_TASK) {
      return;
    }

    onChange([...selectedTagIds, tagId]);
  };

  if (mode === "selectedMenu") {
    return (
      <View style={styles.container}>
        <View style={[styles.list, styles.compactList]}>
          {selectedTags.map((tag) => (
            <TagChip
              key={tag.id}
              compact
              isExiting={exitingTagIds.includes(tag.id)}
              isSelected
              onPress={() => toggleTag(tag.id)}
              tag={tag}
            />
          ))}

          {availableTags.length > 0 && selectedTagIds.length < MAX_TAGS_PER_TASK && (
            <Host matchContents style={styles.menuHost}>
              <Menu
                label={
                  <RNHostView matchContents>
                    <View
                      style={[
                        styles.addChip,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <SymbolView
                        name="plus"
                        size={12}
                        tintColor={colors.text}
                      />
                    </View>
                  </RNHostView>
                }
              >
                {availableTags.map((tag) => (
                  <SwiftButton
                    key={tag.id}
                    label={tag.name}
                    systemImage="tag"
                    onPress={() => toggleTag(tag.id)}
                  />
                ))}
              </Menu>
            </Host>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!compact && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSizes["2xl"] }]}>
            {t("tags.selector.title")}
          </Text>
          <Text style={[styles.count, { color: colors.textSecondary, fontSize: fontSizes.sm }]}>
            {selectedTagIds.length}/{MAX_TAGS_PER_TASK}
          </Text>
        </View>
      )}

      <View style={[styles.list, compact && styles.compactList]}>
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            compact={compact}
            isSelected={selectedTagIds.includes(tag.id)}
            onPress={() => toggleTag(tag.id)}
            tag={tag}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "Satoshi-Regular",
  },
  count: {
    fontFamily: "Satoshi-Medium",
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compactList: {
    gap: 6,
  },
  menuHost: {
    height: 28,
    width: 28,
  },
  chip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  compactChip: {
    minHeight: 28,
    paddingHorizontal: 10,
  },
  chipText: {
    fontFamily: "Satoshi-Medium",
    maxWidth: 110,
  },
  dot: {
    alignItems: "center",
    borderRadius: 999,
    height: 8,
    justifyContent: "center",
    width: 8,
  },
  selectedDot: {
    height: 16,
    width: 16,
  },
  removeIcon: {
    fontFamily: "Satoshi-Bold",
    fontSize: 13,
    lineHeight: 14,
    marginTop: -1,
  },
  addChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
