import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import SpecialistCard, { Specialist } from "../../components/library/SpecialistCard";
import { API_URL } from "../../lib/constants";
import type { LibraryStackParamList } from "../../navigation/MainNavigator";
import { getAuthHeaders } from "../../lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface KnowledgeArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  sourceType: string;  // "admin" | "specialist" | "mom"
  authorName: string | null;
  authorRole: string | null;
  tags: string[];
  ageGroup: string | null;
  trustIndex: number;  // 1-5
  createdAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = spacing.sm;
const HORIZONTAL_PADDING = spacing.md * 2;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING - CARD_GAP) / 2;

const MOCK_SPECIALISTS: Specialist[] = [
  { id: "s1", name: "Елена Романова", specialty: "Эрготерапевт", experience: 8, rating: 4.9, color: "#6B46C1", initials: "ЕР" },
  { id: "s2", name: "Мария Ковалёва", specialty: "Логопед", experience: 12, rating: 4.8, color: "#D53F8C", initials: "МК" },
  { id: "s3", name: "Анна Петрова", specialty: "Поведенческий аналитик", experience: 6, rating: 4.7, color: "#38A169", initials: "АП" },
  { id: "s4", name: "Ольга Сидорова", specialty: "Психолог", experience: 10, rating: 4.9, color: "#D69E2E", initials: "ОС" },
];

const FILTER_CHIPS = [
  { key: "all", label: "Все", tag: "" },
  { key: "сон", label: "Сон", tag: "сон" },
  { key: "еда", label: "Еда", tag: "еда" },
  { key: "истерики", label: "Истерики", tag: "истерики" },
  { key: "речь", label: "Речь", tag: "речь" },
  { key: "сенсорика", label: "Сенсорика", tag: "сенсорика" },
  { key: "РАС", label: "РАС", tag: "РАС" },
  { key: "СДВГ", label: "СДВГ", tag: "СДВГ" },
] as const;

type FilterKey = (typeof FILTER_CHIPS)[number]["key"];

const SOURCE_LABEL: Record<string, string> = {
  admin: "Администратор",
  specialist: "Специалист",
  mom: "Опыт мамы",
};

const CARD_COLORS = [
  "#6B46C1", "#D53F8C", "#38A169", "#D69E2E",
  "#3182CE", "#E53E3E", "#805AD5", "#2C7A7B",
];

function cardColor(index: number): string {
  return CARD_COLORS[index % CARD_COLORS.length] ?? "#6B46C1";
}

function TrustStars({ index }: { index: number }) {
  return (
    <Text style={styles.trustStars}>
      {"★".repeat(index)}{"☆".repeat(5 - index)}
    </Text>
  );
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const label = SOURCE_LABEL[sourceType] ?? sourceType;
  const bgColor =
    sourceType === "admin" ? "#EBF4FF"
    : sourceType === "specialist" ? "#F0FFF4"
    : "#FFF5F5";
  const textColor =
    sourceType === "admin" ? "#2B6CB0"
    : sourceType === "specialist" ? "#276749"
    : "#C53030";

  return (
    <View style={[styles.sourceBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.sourceBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [specialists, setSpecialists] = useState<Specialist[]>(MOCK_SPECIALISTS);
  const [refreshing, setRefreshing] = useState(false);

  const fetchArticles = useCallback(async (tag = "") => {
    try {
      const headers = await getAuthHeaders();
      const url = tag
        ? `${API_URL}/api/knowledge?tag=${encodeURIComponent(tag)}&limit=30`
        : `${API_URL}/api/knowledge?limit=30`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as { data?: KnowledgeArticle[] };
      setArticles(json.data ?? []);
      setError(null);
    } catch {
      setError(t("library.noResults"));
    }
  }, [t]);

  const fetchSpecialists = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/specialist`);
      const json = (await res.json()) as { specialists?: Specialist[] };
      if (json.specialists?.length) setSpecialists(json.specialists);
    } catch {
      // keep mock data
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      const tag = FILTER_CHIPS.find((f) => f.key === activeFilter)?.tag ?? "";
      Promise.all([fetchArticles(tag), fetchSpecialists()]).finally(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }, [fetchArticles, fetchSpecialists, activeFilter])
  );

  async function handleRefresh() {
    setRefreshing(true);
    const tag = FILTER_CHIPS.find((f) => f.key === activeFilter)?.tag ?? "";
    await Promise.all([fetchArticles(tag), fetchSpecialists()]);
    setRefreshing(false);
  }

  async function handleFilterChange(key: FilterKey) {
    setActiveFilter(key);
    setLoading(true);
    const tag = FILTER_CHIPS.find((f) => f.key === key)?.tag ?? "";
    await fetchArticles(tag);
    setLoading(false);
  }

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const filteredArticles = articles.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || (a.authorName ?? "").toLowerCase().includes(q);
  });

  const featuredArticle = filteredArticles[0] ?? null;
  const gridArticles = filteredArticles.slice(1);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("library.title")}</Text>
        <Text style={styles.headerSubtitle}>{t("library.subtitle")}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={colors.textHint} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("library.searchPlaceholder")}
          placeholderTextColor={colors.textHint}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textHint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {FILTER_CHIPS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.tab, activeFilter === f.key && styles.tabActive]}
            onPress={() => handleFilterChange(f.key as FilterKey)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, activeFilter === f.key && styles.tabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Featured article */}
          {featuredArticle && (
            <View style={styles.featuredWrapper}>
              <Text style={styles.sectionTitle}>{t("library.featured")}</Text>
              <TouchableOpacity
                style={[styles.featuredCard, { backgroundColor: cardColor(0) }]}
                activeOpacity={0.88}
                onPress={() => navigation.navigate("ArticleDetail", { articleId: featuredArticle.id })}
              >
                <View style={styles.featuredTop}>
                  <SourceBadge sourceType={featuredArticle.sourceType} />
                  <TouchableOpacity
                    onPress={() => toggleBookmark(featuredArticle.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={bookmarks.has(featuredArticle.id) ? "bookmark" : "bookmark-outline"}
                      size={20}
                      color={colors.white}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.featuredTitle} numberOfLines={3}>
                  {featuredArticle.title}
                </Text>
                <View style={styles.featuredFooter}>
                  <View>
                    <Text style={styles.featuredAuthor}>{featuredArticle.authorName ?? "—"}</Text>
                    <TrustStars index={featuredArticle.trustIndex} />
                  </View>
                  <View style={styles.readButton}>
                    <Text style={styles.readButtonText}>{t("library.read")}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Articles grid */}
          {gridArticles.length > 0 && (
            <View style={styles.gridSection}>
              <Text style={styles.sectionTitle}>{t("library.allArticles")}</Text>
              <View style={styles.grid}>
                {gridArticles.map((article, index) => (
                  <TouchableOpacity
                    key={article.id}
                    style={[styles.gridItem, index % 2 === 1 && styles.gridItemRight]}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate("ArticleDetail", { articleId: article.id })}
                  >
                    <View style={styles.card}>
                      <View style={[styles.cover, { backgroundColor: cardColor(index + 1) }]}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText} numberOfLines={1}>
                            {article.tags[0] ?? article.sourceType}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{article.title}</Text>
                        <Text style={styles.cardAuthor} numberOfLines={1}>
                          {article.authorName ?? "—"}
                        </Text>
                        <SourceBadge sourceType={article.sourceType} />
                        <View style={styles.cardFooter}>
                          <TrustStars index={article.trustIndex} />
                          <TouchableOpacity
                            onPress={() => toggleBookmark(article.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={bookmarks.has(article.id) ? "bookmark" : "bookmark-outline"}
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {gridArticles.length % 2 !== 0 && <View style={styles.gridItem} />}
              </View>
            </View>
          )}

          {/* Empty state */}
          {filteredArticles.length === 0 && !error && (
            <View style={styles.empty}>
              <Ionicons name="library-outline" size={48} color={colors.textHint} />
              <Text style={styles.emptyText}>{t("library.noResults")}</Text>
              <Text style={styles.emptySubtext}>
                {activeFilter !== "all" ? `По тегу «${activeFilter}» статей пока нет` : "Библиотека пополняется"}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.empty}>
              <Ionicons name="wifi-outline" size={48} color={colors.textHint} />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          )}

          {/* Specialists */}
          <View style={styles.specialistsSection}>
            <Text style={styles.sectionTitle}>{t("library.specialists")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.specialistsList}
            >
              {specialists.map((s) => (
                <SpecialistCard key={s.id} specialist={s} onPress={() => {}} />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    ...shadows.sm,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, ...typography.bodySmall, color: colors.textPrimary, padding: 0 },
  tabs: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: colors.white, fontWeight: "600" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  featuredWrapper: { marginTop: spacing.md },
  featuredCard: {
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 180,
    justifyContent: "space-between",
    ...shadows.md,
  },
  featuredTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  featuredTitle: { ...typography.h3, color: colors.white, marginTop: spacing.sm, lineHeight: 24 },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.md,
  },
  featuredAuthor: { ...typography.caption, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  readButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  readButtonText: { ...typography.buttonSmall, color: colors.primary },
  gridSection: { marginTop: spacing.lg },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: CARD_GAP,
  },
  gridItem: { width: CARD_WIDTH },
  gridItemRight: {},
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { height: 76, justifyContent: "flex-end", padding: spacing.sm },
  categoryPill: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  categoryPillText: { ...typography.caption, color: colors.white, fontWeight: "600", fontSize: 10 },
  cardBody: { padding: spacing.sm, gap: spacing.xs },
  cardTitle: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: "600", lineHeight: 18 },
  cardAuthor: { ...typography.caption, color: colors.textSecondary },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  trustStars: { fontSize: 11, color: "#D69E2E", letterSpacing: 1 },
  sourceBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  sourceBadgeText: { fontSize: 10, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textHint, textAlign: "center" },
  emptySubtext: { ...typography.caption, color: colors.textHint, textAlign: "center" },
  specialistsSection: { marginTop: spacing.lg },
  specialistsList: { paddingHorizontal: spacing.md, gap: spacing.sm },
});
