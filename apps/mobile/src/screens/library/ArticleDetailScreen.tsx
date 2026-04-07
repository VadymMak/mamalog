import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, RouteProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import { ARTICLES } from "../../data/articles";
import type { LibraryStackParamList } from "../../navigation/MainNavigator";

type NavProp = NativeStackNavigationProp<LibraryStackParamList, "ArticleDetail">;
type RoutePropType = RouteProp<LibraryStackParamList, "ArticleDetail">;

export default function ArticleDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const { params } = useRoute<RoutePropType>();
  const [bookmarked, setBookmarked] = useState(false);

  const article = ARTICLES.find((a) => a.id === params.articleId);

  const related = ARTICLES.filter(
    (a) => a.id !== params.articleId && a.category === article?.category
  ).slice(0, 2);

  const fallbackRelated = ARTICLES.filter((a) => a.id !== params.articleId).slice(0, 2);
  const relatedArticles = related.length >= 2 ? related : fallbackRelated;

  if (!article) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Статья не найдена</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: article.color }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setBookmarked((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Cover */}
      <View style={[styles.cover, { backgroundColor: article.color }]}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{article.category}</Text>
        </View>
        <Text style={styles.coverTitle}>{article.title}</Text>
        <Text style={styles.coverMeta}>{article.readTime} мин чтения</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Author */}
        <View style={styles.authorCard}>
          <View style={[styles.authorAvatar, { backgroundColor: article.color }]}>
            <Text style={styles.authorInitials}>
              {article.author
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{article.author}</Text>
            <View style={styles.specialtyBadge}>
              <Text style={styles.specialtyText}>{article.specialty}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentBlock}>
          <Text style={styles.contentText}>{article.content}</Text>
        </View>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Похожие статьи</Text>
            {relatedArticles.map((rel) => (
              <TouchableOpacity
                key={rel.id}
                style={styles.relatedCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.replace("ArticleDetail", { articleId: rel.id })
                }
              >
                <View style={[styles.relatedColorBar, { backgroundColor: rel.color }]} />
                <View style={styles.relatedBody}>
                  <Text style={styles.relatedCategory}>{rel.category}</Text>
                  <Text style={styles.relatedCardTitle} numberOfLines={2}>
                    {rel.title}
                  </Text>
                  <Text style={styles.relatedMeta}>
                    {rel.author} · {rel.readTime} мин
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    padding: spacing.xs,
  },
  cover: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  categoryPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  categoryText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
  },
  coverTitle: {
    ...typography.h2,
    color: colors.white,
    lineHeight: 28,
  },
  coverMeta: {
    ...typography.caption,
    color: "rgba(255,255,255,0.75)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  authorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitials: {
    ...typography.h3,
    color: colors.white,
    fontWeight: "700",
  },
  authorInfo: {
    flex: 1,
    gap: 4,
  },
  authorName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  specialtyBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  specialtyText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  contentBlock: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  contentText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  relatedSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  relatedTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  relatedCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  relatedColorBar: {
    width: 4,
  },
  relatedBody: {
    flex: 1,
    padding: spacing.sm,
    gap: 4,
  },
  relatedCategory: {
    ...typography.caption,
    color: colors.textHint,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  relatedCardTitle: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "600",
    lineHeight: 18,
  },
  relatedMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  notFoundText: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  backLink: {
    ...typography.body,
    color: colors.primary,
  },
});
