import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import type { DiaryStackParamList } from "../../navigation/MainNavigator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  date: string;
  createdAt: string;
  moodScore: number;
  emotions: string[];
  triggers: string[];
  notes: string | null;
  sleepHours: number | null;
  energyLevel: number | null;
}

interface ApiResponse {
  success: boolean;
  data: LogEntry;
}

type RouteType = RouteProp<DiaryStackParamList, "LogDetail">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOOD_EMOJIS = [
  { emoji: "😢", score: 1 }, { emoji: "😔", score: 2 }, { emoji: "😕", score: 3 },
  { emoji: "😐", score: 4 }, { emoji: "🙂", score: 5 }, { emoji: "😌", score: 6 },
  { emoji: "😊", score: 7 }, { emoji: "😄", score: 8 }, { emoji: "🤩", score: 9 },
  { emoji: "🌟", score: 10 },
] as const;

function moodEmoji(score: number): string {
  return MOOD_EMOJIS.find((m) => m.score === score)?.emoji ??
    MOOD_EMOJIS.reduce((p, c) =>
      Math.abs(c.score - score) < Math.abs(p.score - score) ? c : p
    ).emoji;
}

function moodColor(score: number): string {
  if (score <= 3) return "#FC8181";
  if (score <= 5) return "#F6AD55";
  if (score <= 7) return "#68D391";
  return "#63B3ED";
}

const EMOTION_COLORS = [
  "#EDE9FE", "#FED7E2", "#C6F6D5", "#FEFCBF", "#BEE3F8",
  "#FED7AA", "#E9D8FD", "#B2F5EA",
];

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("ru", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LogDetailScreen() {
  const { params } = useRoute<RouteType>();
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ApiResponse>(`/api/log/${params.id}`)
      .then((res) => setEntry(res.data.data))
      .catch(() => setError("Не удалось загрузить запись"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Запись не найдена"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const emoji = moodEmoji(entry.moodScore);
  const moodClr = moodColor(entry.moodScore);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood hero */}
        <View style={[styles.moodHero, { backgroundColor: moodClr + "33" }]}>
          <Text style={styles.moodHeroEmoji}>{emoji}</Text>
          <View style={styles.moodHeroInfo}>
            <Text style={styles.moodHeroScore}>
              {entry.moodScore}
              <Text style={styles.moodHeroMax}>/10</Text>
            </Text>
            <View style={[styles.moodBar, { width: "100%" }]}>
              <View
                style={[
                  styles.moodBarFill,
                  { width: `${entry.moodScore * 10}%` as `${number}%`, backgroundColor: moodClr },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Date */}
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={14} color={colors.textHint} />
          <Text style={styles.dateText}>{formatDateTime(entry.date)}</Text>
        </View>

        {/* Emotions */}
        {entry.emotions.length > 0 && (
          <SectionCard title="Эмоции">
            <View style={styles.chipWrap}>
              {entry.emotions.map((e, i) => (
                <View
                  key={e}
                  style={[styles.chip, { backgroundColor: EMOTION_COLORS[i % EMOTION_COLORS.length] }]}
                >
                  <Text style={styles.chipText}>{e}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Triggers */}
        {entry.triggers.length > 0 && (
          <SectionCard title="Триггеры">
            <View style={styles.chipWrap}>
              {entry.triggers.map((tr) => (
                <View key={tr} style={[styles.chip, styles.chipTrigger]}>
                  <Text style={[styles.chipText, styles.chipTextTrigger]}>{tr}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Notes */}
        {entry.notes ? (
          <SectionCard title="Заметки">
            <Text style={styles.notesText}>{entry.notes}</Text>
          </SectionCard>
        ) : null}

        {/* Sleep & Energy */}
        {(entry.sleepHours != null || entry.energyLevel != null) && (
          <SectionCard title="Физическое состояние">
            <View style={styles.statsRow}>
              {entry.sleepHours != null && (
                <View style={styles.statCard}>
                  <Ionicons name="moon-outline" size={22} color={colors.primary} />
                  <Text style={styles.statValue}>{entry.sleepHours}ч</Text>
                  <Text style={styles.statLabel}>Сон</Text>
                </View>
              )}
              {entry.energyLevel != null && (
                <View style={styles.statCard}>
                  <Ionicons name="flash-outline" size={22} color="#D69E2E" />
                  <Text style={styles.statValue}>{entry.energyLevel}/10</Text>
                  <Text style={styles.statLabel}>Энергия</Text>
                </View>
              )}
            </View>
          </SectionCard>
        )}

        {/* Created time */}
        <Text style={styles.createdAt}>
          Создано: {formatDateTime(entry.createdAt)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { ...typography.body, color: colors.error },
  scrollContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  // Mood hero
  moodHero: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.sm,
  },
  moodHeroEmoji: { fontSize: 52 },
  moodHeroInfo: { flex: 1, gap: spacing.sm },
  moodHeroScore: { ...typography.h2, color: colors.textPrimary, fontWeight: "800" },
  moodHeroMax: { ...typography.body, color: colors.textSecondary, fontWeight: "400" },
  moodBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  moodBarFill: { height: "100%", borderRadius: borderRadius.full },

  // Date
  dateRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  dateText: { ...typography.caption, color: colors.textSecondary, textTransform: "capitalize" },

  // Section card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Chips
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  chipText: { ...typography.caption, color: colors.textPrimary, fontWeight: "600" },
  chipTrigger: { backgroundColor: "#FED7D7" },
  chipTextTrigger: { color: "#9B2C2C" },

  // Notes
  notesText: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },

  // Stats
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { ...typography.h3, color: colors.textPrimary, fontWeight: "700" },
  statLabel: { ...typography.caption, color: colors.textSecondary },

  createdAt: {
    ...typography.caption,
    color: colors.textHint,
    textAlign: "center",
    paddingTop: spacing.xs,
  },
});
