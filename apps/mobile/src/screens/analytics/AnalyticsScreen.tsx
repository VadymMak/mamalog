import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import { useLanguageContext } from "../../context/LanguageContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
// card padding (md) on each side × 2 cards (outer scroll + inner card)
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 4;

type Period = 7 | 14 | 30;

// primary color #6B46C1 as rgb components
const PRIMARY_RGB = "107, 70, 193";
const SECONDARY_RGB = "102, 102, 102";

const CHART_CONFIG = {
  backgroundColor: colors.surface,
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  decimalPlaces: 1,
  color: (opacity: number = 1) => `rgba(${PRIMARY_RGB}, ${opacity})`,
  labelColor: (opacity: number = 1) => `rgba(${SECONDARY_RGB}, ${opacity})`,
  strokeWidth: 2,
  propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary },
  propsForBackgroundLines: { strokeDasharray: "4, 4", stroke: colors.border, strokeWidth: "1" },
};

// Maps stored Russian category values → colors
const CATEGORY_COLORS: Record<string, string> = {
  "агрессия":              colors.sos,
  "избегание":             colors.warning,
  "стереотипии":           colors.primary,
  "сенсорная перегрузка":  colors.secondary,
  "регресс":               colors.textSecondary,
  "гиперактивность":       colors.primaryLight,
  "тревожность":           colors.primaryDark,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  date: string;
  moodScore: number;
  energyLevel: number | null;
  sleepHours: number | null;
  emotions: string[];
  triggers: string[];
  notes: string | null;
}

interface BehaviorLog {
  id: string;
  logEntryId: string;
  category: string;
  intensity: number;
}

interface LogApiResponse {
  success: boolean;
  data: LogEntry[];
  total: number;
}

interface BehaviorApiResponse {
  success: boolean;
  data: BehaviorLog[];
}

interface AiChatResponse {
  success: boolean;
  data: { reply: string; language: string; tokensUsed: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function getDateRange(days: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  return { from: toISO(from), to: toISO(to) };
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

function avg(nums: number[]): string {
  if (nums.length === 0) return "—";
  const val = nums.reduce((a, b) => a + b, 0) / nums.length;
  return (Math.round(val * 10) / 10).toString();
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ width, height }: { width: number | string; height: number }) {
  return (
    <View
      style={{
        width: width as number,
        height,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: borderRadius.sm,
      }}
    />
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Mood chart ───────────────────────────────────────────────────────────────

interface MoodChartProps {
  entries: LogEntry[];
  period: Period;
}

function MoodChartSection({ entries, period }: MoodChartProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <View style={commonStyles.card}>
        <SectionHeader title={t("analytics.moodChart")} />
        <Text style={styles.noDataText}>{t("analytics.noData")}</Text>
      </View>
    );
  }

  // Ensure at least 2 points (chart-kit requirement)
  const paddedEntries = entries.length === 1 ? [entries[0], entries[0]] : entries;
  const step = period > 14 ? 4 : period > 7 ? 2 : 1;
  const labels = paddedEntries.map((e, i) =>
    i % step === 0 ? formatShortDate(e.date) : ""
  );
  const data = paddedEntries.map((e) => Math.max(1, Math.min(10, e.moodScore)));

  return (
    <View style={commonStyles.card}>
      <SectionHeader title={t("analytics.moodChart")} />
      <LineChart
        data={{ labels, datasets: [{ data, strokeWidth: 2 }] }}
        width={CHART_WIDTH}
        height={180}
        chartConfig={CHART_CONFIG}
        bezier
        withInnerLines
        withOuterLines={false}
        fromZero={false}
        style={{ borderRadius: borderRadius.md, marginLeft: -spacing.md }}
        yAxisSuffix=""
        yAxisInterval={2}
      />
    </View>
  );
}

// ─── Behavior frequency chart (custom horizontal bars) ────────────────────────

function BehaviorFrequencySection({ behaviors }: { behaviors: BehaviorLog[] }) {
  const { t } = useTranslation();

  const freq: Record<string, number> = {};
  for (const b of behaviors) {
    freq[b.category] = (freq[b.category] ?? 0) + 1;
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <View style={commonStyles.card}>
      <SectionHeader title={t("analytics.behaviorChart")} />
      {sorted.length === 0 ? (
        <Text style={styles.noDataText}>{t("analytics.noData")}</Text>
      ) : (
        <View style={styles.behaviorBarsContainer}>
          {sorted.map(([category, count]) => {
            const barColor = CATEGORY_COLORS[category] ?? colors.primary;
            const fillRatio = count / maxCount;
            return (
              <View key={category} style={styles.behaviorBarRow}>
                <Text style={styles.behaviorBarLabel} numberOfLines={1}>
                  {category}
                </Text>
                <View style={styles.behaviorBarTrack}>
                  <View
                    style={[
                      styles.behaviorBarFill,
                      { flex: fillRatio, backgroundColor: barColor },
                    ]}
                  />
                  <View style={{ flex: 1 - fillRatio }} />
                </View>
                <Text style={[styles.behaviorBarCount, { color: barColor }]}>
                  {count}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── AI insights ──────────────────────────────────────────────────────────────

function AIInsightsSection({
  insights,
  loading,
}: {
  insights: string[];
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View style={commonStyles.card}>
      <View style={styles.insightsHeader}>
        <SectionHeader title={t("analytics.patternsTitle")} />
        <View style={styles.aiLabel}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={styles.aiLabelText}>AI</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.insightsSkeleton}>
          <Skeleton width="90%" height={14} />
          <Skeleton width="80%" height={14} />
          <Skeleton width="85%" height={14} />
        </View>
      ) : insights.length === 0 ? (
        <Text style={styles.noDataText}>{t("analytics.noData")}</Text>
      ) : (
        <View style={styles.insightsList}>
          {insights.map((insight, i) => (
            <View key={i} style={styles.insightCard}>
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Sleep vs Behavior chart (custom per-day bars) ────────────────────────────

interface SleepBehaviorDay {
  label: string;
  sleep: number;
  behaviorCount: number;
}

function SleepBehaviorSection({ days }: { days: SleepBehaviorDay[] }) {
  const { t } = useTranslation();

  const maxSleep = Math.max(...days.map((d) => d.sleep), 1);
  const maxBehavior = Math.max(...days.map((d) => d.behaviorCount), 1);

  const visible = days.filter((d) => d.sleep > 0 || d.behaviorCount > 0);

  return (
    <View style={commonStyles.card}>
      <SectionHeader title={t("analytics.sleepBehaviorTitle")} />

      {visible.length === 0 ? (
        <Text style={styles.noDataText}>{t("analytics.noData")}</Text>
      ) : (
        <>
          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>{t("analytics.sleepHours")}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.sos }]} />
              <Text style={styles.legendText}>{t("analytics.behaviorCount")}</Text>
            </View>
          </View>

          {/* Bars */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sleepBehaviorChart}>
              {visible.map((day) => (
                <View key={day.label} style={styles.sleepBehaviorDay}>
                  <View style={styles.sleepBehaviorBars}>
                    {/* Sleep bar */}
                    <View style={styles.barSlot}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: day.sleep > 0 ? (day.sleep / maxSleep) * 80 : 2,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    {/* Behavior bar */}
                    <View style={styles.barSlot}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: day.behaviorCount > 0
                              ? (day.behaviorCount / maxBehavior) * 80
                              : 2,
                            backgroundColor: colors.sos,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.sleepBehaviorLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { language } = useLanguageContext();

  const [period, setPeriod] = useState<Period>(7);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorLog[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PERIODS: Period[] = [7, 14, 30];

  async function fetchAiInsights(entries: LogEntry[]) {
    if (entries.length === 0) return;
    setAiLoading(true);
    try {
      const res = await api.post<AiChatResponse>("/api/ai/chat", {
        message: `Analyze my diary data and give 3 short insights about patterns you see. Reply in ${language}. Format: just 3 bullet points, max 10 words each.`,
        language,
      });
      const raw = res.data.data.reply;
      const parsed = raw
        .split("\n")
        .map((line) => line.replace(/^[\s•\-*\d.]+/, "").trim())
        .filter((line) => line.length > 3)
        .slice(0, 3);
      setAiInsights(parsed);
    } catch {
      // Silently fail — insights are non-critical
      setAiInsights([]);
    } finally {
      setAiLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setAiInsights([]);

      async function load() {
        setLoading(true);
        setError(null);
        try {
          const { from, to } = getDateRange(period);
          const logRes = await api.get<LogApiResponse>(
            `/api/log?from=${from}&to=${to}`
          );
          if (!active) return;

          const entries = logRes.data.data;
          setLogEntries(entries);

          // Fetch behaviors for all log entries in parallel
          if (entries.length > 0) {
            const behaviorResults = await Promise.all(
              entries.map((e) =>
                api
                  .get<BehaviorApiResponse>(`/api/behavior?logEntryId=${e.id}`)
                  .then((r) => r.data.data)
                  .catch(() => [] as BehaviorLog[])
              )
            );
            if (active) {
              setBehaviors(behaviorResults.flat());
            }
          } else {
            setBehaviors([]);
          }

          if (active) {
            setLoading(false);
            // Non-blocking AI fetch after main data loaded
            fetchAiInsights(entries);
          }
        } catch {
          if (active) {
            setError(t("analytics.loadError"));
            setLoading(false);
          }
        }
      }

      load();
      return () => {
        active = false;
      };
    }, [period, t, language])
  );

  // ── Derived stats ──────────────────────────────────────────────────────────

  const moodScores = logEntries.map((e) => e.moodScore);
  const sleepNums = logEntries
    .map((e) => e.sleepHours)
    .filter((v): v is number => v !== null);
  const energyNums = logEntries
    .map((e) => e.energyLevel)
    .filter((v): v is number => v !== null);

  const sleepBehaviorDays: SleepBehaviorDay[] = logEntries.map((entry) => ({
    label: formatShortDate(entry.date),
    sleep: entry.sleepHours ?? 0,
    behaviorCount: behaviors.filter((b) => b.logEntryId === entry.id).length,
  }));

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("analytics.title")}</Text>
        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                {t(`analytics.period${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={commonStyles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={commonStyles.emptyState}>
          <Text style={[commonStyles.emptyStateText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary row */}
          <View style={styles.summaryRow}>
            <SummaryCard label={t("analytics.avgMood")} value={avg(moodScores)} icon="😊" />
            <SummaryCard label={t("analytics.episodes")} value={String(behaviors.length)} icon="⚡" />
            <SummaryCard label={t("analytics.avgSleep")} value={avg(sleepNums)} icon="🌙" />
            <SummaryCard label={t("analytics.avgEnergy")} value={avg(energyNums)} icon="⚡️" />
          </View>

          {/* Mood chart */}
          <MoodChartSection entries={logEntries} period={period} />

          {/* Behavior frequency */}
          <BehaviorFrequencySection behaviors={behaviors} />

          {/* AI insights */}
          <AIInsightsSection insights={aiInsights} loading={aiLoading} />

          {/* Sleep vs Behavior */}
          <SleepBehaviorSection days={sleepBehaviorDays} />
        </ScrollView>
      )}
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
  periodRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  periodBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  periodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  periodBtnText: { ...typography.bodySmall, color: colors.textSecondary },
  periodBtnTextActive: { color: colors.white, fontWeight: "600" },

  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryIcon: { fontSize: 18, marginBottom: 2 },
  summaryValue: { ...typography.h3, color: colors.primary },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },

  // Section header
  sectionHeader: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  noDataText: {
    ...typography.bodySmall,
    color: colors.textHint,
    textAlign: "center",
    paddingVertical: spacing.md,
  },

  // Behavior frequency bars
  behaviorBarsContainer: { gap: spacing.sm },
  behaviorBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  behaviorBarLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    width: 100,
  },
  behaviorBarTrack: {
    flex: 1,
    flexDirection: "row",
    height: 16,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
  },
  behaviorBarFill: {
    height: 16,
    borderRadius: borderRadius.sm,
  },
  behaviorBarCount: {
    ...typography.caption,
    fontWeight: "700",
    width: 24,
    textAlign: "right",
  },

  // AI insights
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  aiLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EDE9FE",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  aiLabelText: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  insightsSkeleton: { gap: spacing.sm, paddingVertical: spacing.xs },
  insightsList: { gap: spacing.sm },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#EDE9FE",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  insightText: { ...typography.bodySmall, color: colors.primaryDark, flex: 1, lineHeight: 20 },

  // Sleep vs Behavior
  legendRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: borderRadius.full },
  legendText: { ...typography.caption, color: colors.textSecondary },
  sleepBehaviorChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sleepBehaviorDay: { alignItems: "center", gap: spacing.xs },
  sleepBehaviorBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 84,
    gap: 3,
  },
  barSlot: {
    width: 12,
    height: 84,
    justifyContent: "flex-end",
  },
  barFill: {
    width: 12,
    borderRadius: 3,
    minHeight: 2,
  },
  sleepBehaviorLabel: {
    ...typography.caption,
    color: colors.textHint,
    fontSize: 10,
  },
});
