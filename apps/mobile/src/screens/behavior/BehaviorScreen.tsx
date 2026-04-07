import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import type { BehaviorStackParamList } from "../../navigation/MainNavigator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BehaviorLog {
  id: string;
  logEntryId: string;
  category: string;
  trigger: string | null;
  intensity: number;
  duration: number | null;
  context: string | null;
  createdAt: string;
}

interface LogApiResponse {
  success: boolean;
  data: { id: string; date: string }[];
}

interface BehaviorApiResponse {
  success: boolean;
  data: BehaviorLog[];
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_KEYS = [
  "aggression", "avoidance", "stereotypies", "sensorOverload",
  "regression", "hyperactivity", "anxiety",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

const CATEGORY_VALUES: Record<CategoryKey, string> = {
  aggression:     "агрессия",
  avoidance:      "избегание",
  stereotypies:   "стереотипии",
  sensorOverload: "сенсорная перегрузка",
  regression:     "регресс",
  hyperactivity:  "гиперактивность",
  anxiety:        "тревожность",
};

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  aggression:     colors.sos,
  avoidance:      colors.warning,
  stereotypies:   colors.primary,
  sensorOverload: colors.secondary,
  regression:     colors.textSecondary,
  hyperactivity:  colors.primaryLight,
  anxiety:        colors.primaryDark,
};

function categoryColorByValue(value: string): string {
  const entry = Object.entries(CATEGORY_VALUES).find(([, v]) => v === value);
  return entry ? CATEGORY_COLORS[entry[0] as CategoryKey] : colors.primary;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ru", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcTopTrigger(behaviors: BehaviorLog[]): string | null {
  const freq: Record<string, number> = {};
  for (const b of behaviors) {
    if (b.trigger) freq[b.trigger] = (freq[b.trigger] ?? 0) + 1;
  }
  const entries = Object.entries(freq);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function calcAvgIntensity(behaviors: BehaviorLog[]): string {
  if (behaviors.length === 0) return "—";
  const avg = behaviors.reduce((s, b) => s + b.intensity, 0) / behaviors.length;
  return (Math.round(avg * 10) / 10).toString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function IntensityBar({ intensity }: { intensity: number }) {
  const barColor =
    intensity <= 3 ? colors.success :
    intensity <= 6 ? colors.warning : colors.sos;

  return (
    <View style={styles.intensityRow}>
      {Array.from({ length: 10 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.intensitySegment,
            { backgroundColor: i < intensity ? barColor : colors.surfaceSecondary },
          ]}
        />
      ))}
    </View>
  );
}

function BehaviorCard({ item }: { item: BehaviorLog }) {
  const catColor = categoryColorByValue(item.category);
  return (
    <View style={[commonStyles.card, styles.behaviorCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + "22", borderColor: catColor }]}>
          <Text style={[styles.categoryBadgeText, { color: catColor }]}>{item.category}</Text>
        </View>
        <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
      </View>

      {item.trigger ? (
        <View style={styles.triggerTag}>
          <Text style={styles.triggerText}>⚡ {item.trigger}</Text>
        </View>
      ) : null}

      <IntensityBar intensity={item.intensity} />

      <View style={styles.cardMeta}>
        {item.duration !== null && (
          <Text style={styles.durationText}>{item.duration} мин</Text>
        )}
        {item.context ? (
          <Text style={styles.contextText} numberOfLines={2}>{item.context}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BehaviorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BehaviorStackParamList>>();

  const [behaviors, setBehaviors] = useState<BehaviorLog[]>([]);
  const [todayLogId, setTodayLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<CategoryKey | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setError(null);
        try {
          const logRes = await api.get<LogApiResponse>(`/api/log?date=${todayISO()}`);
          const logEntry = logRes.data.data[0];
          if (!active) return;
          if (!logEntry) {
            setBehaviors([]);
            setTodayLogId(null);
            setLoading(false);
            return;
          }
          setTodayLogId(logEntry.id);
          const bRes = await api.get<BehaviorApiResponse>(`/api/behavior?logEntryId=${logEntry.id}`);
          if (active) setBehaviors(bRes.data.data);
        } catch {
          if (active) setError(t("behavior.loadError"));
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => { active = false; };
    }, [t])
  );

  const filtered = activeKey
    ? behaviors.filter((b) => b.category === CATEGORY_VALUES[activeKey])
    : behaviors;

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("behavior.title")}</Text>
        <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <SummaryCard label={t("behavior.episodesToday")} value={String(behaviors.length)} />
        <SummaryCard label={t("behavior.avgIntensity")} value={calcAvgIntensity(behaviors)} />
        <SummaryCard label={t("behavior.topTrigger")} value={calcTopTrigger(behaviors) ?? "—"} />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[commonStyles.tag, activeKey === null && commonStyles.tagSelected]}
          onPress={() => setActiveKey(null)}
          activeOpacity={0.7}
        >
          <Text style={[commonStyles.tagText, activeKey === null && commonStyles.tagTextSelected]}>
            {t("behavior.filterAll")}
          </Text>
        </TouchableOpacity>
        {CATEGORY_KEYS.map((key) => {
          const active = activeKey === key;
          return (
            <TouchableOpacity
              key={key}
              style={[commonStyles.tag, active && commonStyles.tagSelected]}
              onPress={() => setActiveKey(key)}
              activeOpacity={0.7}
            >
              <Text style={[commonStyles.tagText, active && commonStyles.tagTextSelected]}>
                {t(`behavior.categories.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={commonStyles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={commonStyles.emptyState}>
          <Text style={[commonStyles.emptyStateText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={commonStyles.emptyState}>
          <Text style={styles.emptyEmoji}>🧩</Text>
          <Text style={commonStyles.emptyStateText}>{t("behavior.noEpisodes")}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BehaviorCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={commonStyles.fab}
        onPress={() => navigation.navigate("NewBehavior", { logEntryId: todayLogId ?? undefined })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { ...typography.h3, color: colors.primary },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  filterScroll: {
    maxHeight: 52,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.xl,
    gap: spacing.sm,
  },
  behaviorCard: { gap: spacing.xs },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  categoryBadgeText: { ...typography.caption, fontWeight: "600" },
  cardTime: { ...typography.caption, color: colors.textHint },
  triggerTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.sosLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  triggerText: { ...typography.caption, color: colors.sos },
  intensityRow: { flexDirection: "row", gap: 3, marginVertical: spacing.xs },
  intensitySegment: { flex: 1, height: 6, borderRadius: 3 },
  cardMeta: { gap: spacing.xs },
  durationText: { ...typography.caption, color: colors.textSecondary },
  contextText: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32, fontWeight: "300" },
});
