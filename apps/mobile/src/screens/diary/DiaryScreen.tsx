import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { colors } from "../../lib/colors";
import type { DiaryStackParamList } from "../../navigation/MainNavigator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntryItem {
  id: string;
  date: string;
  moodScore: number;
  emotions: string[];
  notes: string | null;
  sleepHours: number | null;
}

interface ApiResponse {
  success: boolean;
  data: LogEntryItem[];
  total: number;
}

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOOD_EMOJIS: { emoji: string; score: number }[] = [
  { emoji: "😢", score: 2 },
  { emoji: "😔", score: 4 },
  { emoji: "😐", score: 5 },
  { emoji: "🙂", score: 7 },
  { emoji: "😊", score: 9 },
];

function moodEmojiForScore(score: number): string {
  const best = MOOD_EMOJIS.reduce((prev, curr) =>
    Math.abs(curr.score - score) < Math.abs(prev.score - score) ? curr : prev
  );
  return best.emoji;
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
            style={[
              styles.moodButton,
              selectedScore === score && styles.moodButtonSelected,
            ]}
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
  const actions = [
    { label: t("diary.behavior") },
    { label: t("diary.sleep") },
    { label: t("diary.food") },
    { label: t("diary.emotions") },
  ];

  return (
    <View style={styles.section}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.quickPill}
            onPress={onNewLog}
            activeOpacity={0.7}
          >
            <Text style={styles.quickPillText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

interface LogCardProps {
  item: LogEntryItem;
}

function LogCard({ item }: LogCardProps) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logCardLeft}>
        <Text style={styles.logTime}>{formatTime(item.date)}</Text>
        <Text style={styles.logEmoji}>{moodEmojiForScore(item.moodScore)}</Text>
      </View>
      <View style={styles.logCardBody}>
        {item.notes ? (
          <Text style={styles.logNotes} numberOfLines={2}>
            {item.notes}
          </Text>
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

  function handleNewLog() {
    navigation.navigate("NewLog");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Date header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("diary.title")}</Text>
          <Text style={styles.headerDate}>{formatDate(new Date().toISOString())}</Text>
        </View>

        <MoodSection selectedScore={selectedMood} onSelect={setSelectedMood} />
        <QuickActions onNewLog={handleNewLog} />

        {/* Timeline */}
        <View style={styles.timelineHeader}>
          <Text style={styles.sectionLabel}>
            {entries.length > 0 ? `${entries.length} ${t("diary.entry")}` : ""}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>📓</Text>
            <Text style={styles.emptyText}>{t("diary.noEntries")}</Text>
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

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewLog}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  section: {
    backgroundColor: colors.card,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
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
    borderRadius: 26,
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
  moodEmoji: {
    fontSize: 26,
  },
  quickRow: {
    gap: 8,
    paddingBottom: 2,
  },
  quickPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  timelineHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  errorText: {
    fontSize: 15,
    color: colors.sos,
    textAlign: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    gap: 8,
  },
  logCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
  },
  logCardLeft: {
    alignItems: "center",
    marginRight: 12,
    minWidth: 44,
  },
  logTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  logEmoji: {
    fontSize: 24,
  },
  logCardBody: {
    flex: 1,
    justifyContent: "center",
  },
  logNotes: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  logEmotions: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 32,
    fontWeight: "300",
  },
});
