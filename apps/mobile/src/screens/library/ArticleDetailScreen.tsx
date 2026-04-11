import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import { ARTICLES } from "../../data/articles";
import type { LibraryStackParamList } from "../../navigation/MainNavigator";
import { API_URL } from "../../lib/constants";
import { api, getAuthHeaders } from "../../lib/api";

type NavProp = NativeStackNavigationProp<LibraryStackParamList, "ArticleDetail">;
type RoutePropType = RouteProp<LibraryStackParamList, "ArticleDetail">;

interface RemoteArticle {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  authorName: string | null;
  authorRole: string | null;
  tags: string[];
  trustIndex: number;
  createdAt: string;
}

const CARD_COLORS = [
  "#6B46C1", "#D53F8C", "#38A169", "#D69E2E",
  "#3182CE", "#E53E3E", "#805AD5", "#2C7A7B",
];

function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length] ?? "#6B46C1";
}

export default function ArticleDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const { params } = useRoute<RoutePropType>();
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [remote, setRemote] = useState<RemoteArticle | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Try local first
  const localArticle = ARTICLES.find((a) => a.id === params.articleId);

  // Fetch remote article if not in local data
  useEffect(() => {
    if (localArticle) return;
    setLoadingRemote(true);
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/api/articles/${params.articleId}`, { headers });
        if (!res.ok) { setNotFound(true); return; }
        const json = await res.json() as { data?: RemoteArticle };
        if (json.data) setRemote(json.data);
        else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setLoadingRemote(false);
      }
    })();
  }, [params.articleId]);

  // Load bookmark state from API
  useEffect(() => {
    api.get(`/api/bookmarks/${params.articleId}`)
      .then((res) => { if (res.data.success) setBookmarked(res.data.data.bookmarked); })
      .catch(() => {}); // fail silently
  }, [params.articleId]);

  // Toggle bookmark via API
  const toggleBookmark = useCallback(async () => {
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    setBookmarked((v) => !v); // optimistic
    try {
      const res = await api.post(`/api/bookmarks/${params.articleId}`);
      if (res.data.success) setBookmarked(res.data.data.bookmarked);
    } catch {
      setBookmarked((v) => !v); // revert on error
    } finally {
      setBookmarkLoading(false);
    }
  }, [params.articleId, bookmarkLoading]);

  // Related articles (local only)
  const related = ARTICLES.filter(
    (a) => a.id !== params.articleId && a.category === localArticle?.category
  ).slice(0, 2);
  const fallbackRelated = ARTICLES.filter((a) => a.id !== params.articleId).slice(0, 2);
  const relatedArticles = related.length >= 2 ? related : fallbackRelated;

  // Loading state
  if (loadingRemote) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Not found
  if (!localArticle && !remote || notFound) {
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

  // Unified view data
  const isRemote = !localArticle && !!remote;
  const articleColor = isRemote ? colorFromId(remote!.id) : localArticle!.color;

  const title = isRemote ? remote!.title : localArticle!.title;
  const content = isRemote ? remote!.content : localArticle!.content;
  const authorName = isRemote ? (remote!.authorName ?? "Автор") : localArticle!.author;
  const authorRole = isRemote ? (remote!.authorRole ?? remote!.sourceType) : localArticle!.specialty;
  const category = isRemote ? (remote!.tags[0] ?? remote!.sourceType) : localArticle!.category;
  const readTime = isRemote
    ? Math.max(1, Math.round(remote!.content.split(" ").length / 200))
    : localArticle!.readTime;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: articleColor }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={toggleBookmark}
          disabled={bookmarkLoading}
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
      <View style={[styles.cover, { backgroundColor: articleColor }]}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        <Text style={styles.coverTitle}>{title}</Text>
        <Text style={styles.coverMeta}>{readTime} мин чтения</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Author */}
        <View style={styles.authorCard}>
          <View style={[styles.authorAvatar, { backgroundColor: articleColor }]}>
            <Text style={styles.authorInitials}>
              {authorName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <View style={styles.specialtyBadge}>
              <Text style={styles.specialtyText}>{authorRole}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentBlock}>
          <Markdown style={markdownStyles}>{content}</Markdown>
        </View>

        {/* Related articles — only shown for local articles */}
        {!isRemote && relatedArticles.length > 0 && (
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

const markdownStyles = {
  body: { color: colors.textPrimary, fontSize: 15, lineHeight: 24 },
  heading1: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" as const, marginBottom: 8, marginTop: 16 },
  heading2: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" as const, marginBottom: 6, marginTop: 12 },
  heading3: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" as const, marginBottom: 4, marginTop: 10 },
  strong: { fontWeight: "700" as const },
  em: { fontStyle: "italic" as const },
  bullet_list: { marginLeft: 8 },
  ordered_list: { marginLeft: 8 },
  blockquote: { backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.primary, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, borderRadius: 4 },
  code_inline: { backgroundColor: colors.surfaceSecondary, color: colors.primary, borderRadius: 4, paddingHorizontal: 4 },
  fence: { backgroundColor: colors.surfaceSecondary, borderRadius: 8, padding: 12 },
};

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
