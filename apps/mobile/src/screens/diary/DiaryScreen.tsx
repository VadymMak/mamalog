import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
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
  triggers: string[];
  notes: string | null;
  energyLevel: number | null;
  sleepHours: number | null;
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
  return MOOD_EMOJIS.reduce((prev, curr) =>
    Math.abs(curr.score - score) < Math.abs(prev.score - score) ? curr : prev
  ).emoji;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ru", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ─── Swipeable log card ───────────────────────────────────────────────────────

const SWIPE_THRESHOLD = -72;
const DELETE_BTN_WIDTH = 80;

interface SwipeableLogCardProps {
  item: LogEntryItem;
  onPress: () => void;
  onDelete: (id: string) => Promise<void>;
}

function SwipeableLogCard({ item, onPress, onDelete }: SwipeableLogCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current;
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const x = Math.min(0, Math.max(g.dx + (isOpen ? SWIPE_THRESHOLD : 0), -DELETE_BTN_WIDTH));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        const currentX = g.dx + (isOpen ? SWIPE_THRESHOLD : 0);
        if (currentX < SWIPE_THRESHOLD / 2) {
          Animated.spring(translateX, { toValue: SWIPE_THRESHOLD, useNativeDriver: true }).start();
          setIsOpen(true);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setIsOpen(false);
        }
      },
    })
  ).current;

  function close() {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setIsOpen(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(item.id);
      Animated.timing(rowHeight, {
        toValue: 0, duration: 250, useNativeDriver: false,
      }).start();
    } catch {
      close();
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel", onPress: close },
      { text: "Удалить", style: "destructive", onPress: handleDelete },
    ]);
  }

  return (
    <Animated.View
      style={[
        styles.swipeRow,
        {
          maxHeight: rowHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 200],
          }),
          opacity: rowHeight,
          marginBottom: rowHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, spacing.sm],
          }),
        },
      ]}
    >
      {/* Delete button (behind) */}
      <View style={styles.deleteBtn}>
        {deleting ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtnInner}>
            <Ionicons name="trash-outline" size={22} color={colors.white} />
            <Text style={styles.deleteBtnText}>Удалить</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Card (front) */}
      <Animated.View
        style={[styles.logCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.logCardInner}
          onPress={() => { if (isOpen) { close(); } else { onPress(); } }}
          activeOpacity={0.85}
        >
          <View style={styles.logCardLeft}>
            <Text style={styles.logTime}>{formatTime(item.date)}</Text>
            <Text style={styles.logEmoji}>{moodEmojiForScore(item.moodScore)}</Text>
            <Text style={styles.logScore}>{item.moodScore}/10</Text>
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
            {(item.sleepHours != null || item.energyLevel != null) && (
              <View style={styles.logMeta}>
                {item.sleepHours != null && (
                  <View style={styles.metaChip}>
                    <Ionicons name="moon-outline" size={11} color={colors.textHint} />
                    <Text style={styles.metaChipText}>{item.sleepHours}ч</Text>
                  </View>
                )}
                {item.energyLevel != null && (
                  <View style={styles.metaChip}>
                    <Ionicons name="flash-outline" size={11} color={colors.textHint} />
                    <Text style={styles.metaChipText}>{item.energyLevel}/10</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
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

function QuickActions({ onNewLog }: { onNewLog: () => void }) {
  const { t } = useTranslation();
  const pills = [t("diary.behavior"), t("diary.sleep"), t("diary.food"), t("diary.emotions")];
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

  async function handleDelete(id: string): Promise<void> {
    await api.delete(`/api/log/${id}`);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

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
          renderItem={({ item }) => (
            <SwipeableLogCard
              item={item}
              onPress={() => navigation.navigate("LogDetail", { id: item.id })}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={commonStyles.fab}
        onPress={() => navigation.navigate("NewLog")}
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
  moodRow: { flexDirection: "row", justifyContent: "space-between" },
  moodButton: {
    width: 52, height: 52,
    borderRadius: borderRadius.full,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "transparent",
    backgroundColor: colors.background,
  },
  moodButtonSelected: { borderColor: colors.primary, backgroundColor: "#EDE9FE" },
  moodEmoji: { fontSize: 26 },
  quickRow: { gap: spacing.sm, paddingBottom: 2 },
  quickPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: "#EDE9FE", borderWidth: 1, borderColor: colors.primary,
  },
  quickPillText: { ...typography.buttonSmall, color: colors.primary },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.xl,
  },

  // Swipeable row
  swipeRow: { position: "relative", overflow: "hidden" },
  deleteBtn: {
    position: "absolute",
    right: 0, top: 0, bottom: 0,
    width: DELETE_BTN_WIDTH,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnInner: { alignItems: "center", gap: 2 },
  deleteBtnText: { ...typography.caption, color: colors.white, fontWeight: "700" },

  // Log card
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  logCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm + spacing.xs,
    gap: spacing.sm,
  },
  logCardLeft: { alignItems: "center", minWidth: 44 },
  logTime: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  logEmoji: { fontSize: 24 },
  logScore: { ...typography.caption, color: colors.textHint, marginTop: 2 },
  logCardBody: { flex: 1 },
  logNotes: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 20 },
  logEmotions: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  logMeta: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  metaChipText: { ...typography.caption, color: colors.textHint },

  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32, fontWeight: "300" },
});
