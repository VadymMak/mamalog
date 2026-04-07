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
import type { DiaryStackParamList } from "../../navigation/MainNavigator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntryItem {
  id: string;
  date: string;
  moodScore: number;
  emotions: string[];
  notes: string | null;
}

interface ApiResponse {
  success: boolean;
  data: LogEntryItem[];
  total: number;
}

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOOD_EMOJIS = [
  { emoji: "😢", score: 2 },
  { emoji: "😔", score: 4 },
  { emoji: "😐", score: 5 },
  { emoji: "🙂", score: 7 },
  { emoji: "😊", score: 9 },
] as const;

function moodEmojiForScore(score: number): string {
  return (
    MOOD_EMOJIS.reduce((prev, curr) =>
      Math.abs(curr.score - score) < Math.abs(prev.score - score) ? curr : prev
    ).emoji
  );
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ru", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ru", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MoodSectionProps {
  selectedScore: number | null;
  onSelect: (score: number) => void;
}

function MoodSection({ selectedScore, onSelect }: MoodSectionProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t("diary.moodLabel")}</Text>
      <View style={styles.moodRow}>
        {MOOD_EMOJIS.map(({ emoji, score }) => (
          <TouchableOpacity
            key={score}
            style={[styles.moodButton, selectedScore === score && styles.moodButtonSelected]}
            onPress={() => onSelect(score)}
            activeOpacity={0.7}
          >
            <Text style={styles.moodEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

interface QuickActionsProps {
  onNewLog: () => void;
}

function QuickActions({ onNewLog }: QuickActionsProps) {
  const { t } = useTranslation();
  const pills = [
    t("diary.behavior"),
    t("diary.sleep"),
    t("diary.food"),
    t("diary.emotions"),
  ];
  return (
    <View style={styles.section}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {pills.map((label) => (
          <TouchableOpacity key={label} style={styles.quickPill} onPress={onNewLog} activeOpacity={0.7}>
            <Text style={styles.quickPillText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function LogCard({ item }: { item: LogEntryItem }) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logCardLeft}>
        <Text style={styles.logTime}>{formatTime(item.date)}</Text>
        <Text style={styles.logEmoji}>{moodEmojiForScore(item.moodScore)}</Text>
      </View>
      <View style={styles.logCardBody}>
        {item.notes ? (
          <Text style={styles.logNotes} numberOfLines={2}>{item.notes}</Text>
        ) : null}
        {item.emotions.length > 0 && (
          <Text style={styles.logEmotions} numberOfLines={1}>
            {item.emotions.join(" · ")}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DiaryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<DiaryStackParamList>>();

  const [entries, setEntries] = useState<LogEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function fetchToday() {
        setLoading(true);
        setError(null);
        try {
          const res = await api.get<ApiResponse>(`/api/log?date=${todayISO()}`);
          if (active) setEntries(res.data.data);
        } catch {
          if (active) setError(t("diary.loadError"));
        } finally {
          if (active) setLoading(false);
        }
      }
      fetchToday();
      return () => { active = false; };
    }, [t])
  );

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("diary.title")}</Text>
        <Text style={styles.headerDate}>{formatDate(new Date().toISOString())}</Text>
      </View>

      <MoodSection selectedScore={selectedMood} onSelect={setSelectedMood} />
      <QuickActions onNewLog={() => navigation.navigate("NewLog")} />

      {loading ? (
        <View style={commonStyles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={commonStyles.emptyState}>
          <Text style={[commonStyles.emptyStateText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={commonStyles.emptyState}>
          <Text style={styles.emptyEmoji}>📓</Text>
          <Text style={commonStyles.emptyStateText}>{t("diary.noEntries")}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={commonStyles.fab} onPress={() => navigation.navigate("NewLog")} activeOpacity={0.85}>
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
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moodButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.background,
  },
  moodButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: "#EDE9FE",
  },
  moodEmoji: { fontSize: 26 },
  quickRow: { gap: spacing.sm, paddingBottom: 2 },
  quickPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickPillText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.xl,
    gap: spacing.sm,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + spacing.xs,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  logCardLeft: {
    alignItems: "center",
    marginRight: spacing.sm,
    minWidth: 44,
  },
  logTime: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  logEmoji: { fontSize: 24 },
  logCardBody: { flex: 1, justifyContent: "center" },
  logNotes: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 20 },
  logEmotions: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32, fontWeight: "300" },
});
