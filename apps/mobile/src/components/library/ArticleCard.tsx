import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, typography } from "../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Article {
  id: string;
  title: string;
  category: string;
  author: string;
  specialty: string;
  readTime: number;
  color: string;
}

interface ArticleCardProps {
  article: Article;
  bookmarked: boolean;
  onBookmark: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArticleCard({ article, bookmarked, onBookmark }: ArticleCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      {/* Color cover block */}
      <View style={[styles.cover, { backgroundColor: article.color }]}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText} numberOfLines={1}>
            {article.category}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {article.author}
        </Text>
        <View style={styles.specialtyBadge}>
          <Text style={styles.specialtyText} numberOfLines={1}>
            {article.specialty}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.readTime}>
            {article.readTime} {t("library.minRead")}
          </Text>
          <TouchableOpacity
            onPress={() => onBookmark(article.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: {
    height: 76,
    justifyContent: "flex-end",
    padding: spacing.sm,
  },
  categoryPill: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  categoryPillText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
    fontSize: 10,
  },
  body: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "600",
    lineHeight: 18,
  },
  author: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  specialtyBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  specialtyText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  readTime: {
    ...typography.caption,
    color: colors.textHint,
  },
});
