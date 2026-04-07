import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import ArticleCard, { Article } from "../../components/library/ArticleCard";
import SpecialistCard, { Specialist } from "../../components/library/SpecialistCard";
import { API_BASE_URL } from "../../lib/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = spacing.sm;
const HORIZONTAL_PADDING = spacing.md * 2;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING - CARD_GAP) / 2;

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ARTICLES: Article[] = [
  {
    id: "1",
    title: "Сенсорные техники для снижения перегрузки",
    category: "Сенсорная интеграция",
    author: "Е. Романова",
    specialty: "Эрготерапевт",
    readTime: 5,
    color: "#6B46C1",
  },
  {
    id: "2",
    title: "Альтернативная коммуникация для неговорящих детей",
    category: "Речевое развитие",
    author: "М. Ковалёва",
    specialty: "Логопед",
    readTime: 7,
    color: "#D53F8C",
  },
  {
    id: "3",
    title: "Как справляться с истериками без стресса",
    category: "Поведенческие техники",
    author: "А. Петрова",
    specialty: "Поведенческий аналитик",
    readTime: 6,
    color: "#38A169",
  },
  {
    id: "4",
    title: "Регуляция эмоций: практические упражнения",
    category: "Эмоциональная регуляция",
    author: "О. Сидорова",
    specialty: "Психолог",
    readTime: 8,
    color: "#D69E2E",
  },
  {
    id: "5",
    title: "Забота о себе: ресурс для мамы особого ребёнка",
    category: "Поддержка мамы",
    author: "Т. Белова",
    specialty: "Психотерапевт",
    readTime: 4,
    color: "#2B6CB0",
  },
  {
    id: "6",
    title: "Визуальные расписания: пошаговый гайд",
    category: "Поведенческие техники",
    author: "К. Морозова",
    specialty: "АВА-терапевт",
    readTime: 5,
    color: "#744210",
  },
];

const MOCK_SPECIALISTS: Specialist[] = [
  {
    id: "s1",
    name: "Елена Романова",
    specialty: "Эрготерапевт",
    experience: 8,
    rating: 4.9,
    color: "#6B46C1",
    initials: "ЕР",
  },
  {
    id: "s2",
    name: "Мария Ковалёва",
    specialty: "Логопед",
    experience: 12,
    rating: 4.8,
    color: "#D53F8C",
    initials: "МК",
  },
  {
    id: "s3",
    name: "Анна Петрова",
    specialty: "Поведенческий аналитик",
    experience: 6,
    rating: 4.7,
    color: "#38A169",
    initials: "АП",
  },
  {
    id: "s4",
    name: "Ольга Сидорова",
    specialty: "Психолог",
    experience: 10,
    rating: 4.9,
    color: "#D69E2E",
    initials: "ОС",
  },
];

// ─── Category tabs ─────────────────────────────────────────────────────────────

const CATEGORY_KEYS = [
  "all",
  "sensory",
  "speech",
  "emotional",
  "behavioral",
  "momSupport",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

const CATEGORY_FILTER_VALUES: Record<CategoryKey, string> = {
  all: "",
  sensory: "Сенсорная интеграция",
  speech: "Речевое развитие",
  emotional: "Эмоциональная регуляция",
  behavioral: "Поведенческие техники",
  momSupport: "Поддержка мамы",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [specialists, setSpecialists] = useState<Specialist[]>(MOCK_SPECIALISTS);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchSpecialists = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/specialist`);
          const json = await res.json();
          if (active && json.specialists?.length) {
            setSpecialists(json.specialists);
          }
        } catch {
          // keep mock data
        }
      };

      fetchSpecialists();
      return () => {
        active = false;
      };
    }, [])
  );

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredArticles = MOCK_ARTICLES.filter((a) => {
    const matchCategory =
      activeCategory === "all" ||
      a.category === CATEGORY_FILTER_VALUES[activeCategory];
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.author.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
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

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {CATEGORY_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeCategory === key && styles.tabActive]}
            onPress={() => setActiveCategory(key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === key && styles.tabTextActive,
              ]}
            >
              {t(`library.cat_${key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Featured article */}
        {featuredArticle && (
          <View style={styles.featuredWrapper}>
            <Text style={styles.sectionTitle}>{t("library.featured")}</Text>
            <TouchableOpacity
              style={[styles.featuredCard, { backgroundColor: featuredArticle.color }]}
              activeOpacity={0.88}
            >
              <View style={styles.featuredTop}>
                <View style={styles.featuredCategoryPill}>
                  <Text style={styles.featuredCategoryText} numberOfLines={1}>
                    {featuredArticle.category}
                  </Text>
                </View>
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
                  <Text style={styles.featuredAuthor}>{featuredArticle.author}</Text>
                  <Text style={styles.featuredMeta}>
                    {featuredArticle.readTime} {t("library.minRead")}
                  </Text>
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
                <View key={article.id} style={[styles.gridItem, index % 2 === 1 && styles.gridItemRight]}>
                  <ArticleCard
                    article={article}
                    bookmarked={bookmarks.has(article.id)}
                    onBookmark={toggleBookmark}
                  />
                </View>
              ))}
              {/* Fill empty slot if odd count */}
              {gridArticles.length % 2 !== 0 && <View style={styles.gridItem} />}
            </View>
          </View>
        )}

        {/* Empty state */}
        {filteredArticles.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textHint} />
            <Text style={styles.emptyText}>{t("library.noResults")}</Text>
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
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
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.textPrimary,
    padding: 0,
  },
  tabs: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  featuredWrapper: {
    marginTop: spacing.md,
  },
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
  featuredCategoryPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  featuredCategoryText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },
  featuredTitle: {
    ...typography.h3,
    color: colors.white,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.md,
  },
  featuredAuthor: {
    ...typography.caption,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  featuredMeta: {
    ...typography.caption,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  readButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  readButtonText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  gridSection: {
    marginTop: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: CARD_GAP,
  },
  gridItem: {
    width: CARD_WIDTH,
  },
  gridItemRight: {
    // no extra style needed — gap handles spacing
  },
  empty: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textHint,
    textAlign: "center",
  },
  specialistsSection: {
    marginTop: spacing.lg,
  },
  specialistsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
