import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import { commonStyles } from "../../theme/components";

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonNoteRoute = RouteProp<{ LessonNote: { lessonId: string } }, "LessonNote">;

interface LessonDetail {
  id: string;
  title: string;
  type: string;
  color: string;
  date: string;
  startTime: string;
  duration: number;
  rating: number | null;
  note: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_EMOJIS: Record<string, string> = {
  speech: "🗣️",
  aba: "🧩",
  ergo: "🤲",
  school: "🏫",
  sensory: "🌀",
  other: "➕",
};

const CHILD_MOODS = [
  { value: "calm", label: "Спокойный", emoji: "😊" },
  { value: "neutral", label: "Нейтральный", emoji: "😐" },
  { value: "hard", label: "Тяжело", emoji: "😢" },
] as const;

type ChildMood = (typeof CHILD_MOODS)[number]["value"];

const MONTHS_GENITIVE_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLessonDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return `${date.getDate()} ${MONTHS_GENITIVE_RU[date.getMonth()]} ${date.getFullYear()}`;
}

function ratingColor(n: number): string {
  if (n <= 3) return colors.error;
  if (n <= 6) return colors.warning;
  return colors.success;
}

// ─── LessonNoteScreen ─────────────────────────────────────────────────────────

export default function LessonNoteScreen() {
  const route = useRoute<LessonNoteRoute>();
  const navigation = useNavigation();
  const { lessonId } = route.params;

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);

  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [childMood, setChildMood] = useState<ChildMood | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Fetch lesson ─────────────────────────────────────────────────────────

  useEffect(() => {
    api
      .get<{ success: boolean; data: LessonDetail }>(`/api/lessons/${lessonId}`)
      .then((res) => {
        if (res.data.success) {
          const l = res.data.data;
          setLesson(l);
          // Pre-fill if already has a note/rating
          if (l.rating !== null) setRating(l.rating);
          if (l.note) setNote(l.note);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLesson(false));
  }, [lessonId]);

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!rating) {
      Alert.alert("Ошибка", "Поставьте оценку занятию (1–10)");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/api/lessons/${lessonId}`, { rating, note: note.trim() || null });
      Alert.alert("Готово", "Заметка сохранена!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить заметку");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingLesson) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <View style={commonStyles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.screen} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Lesson info card ── */}
          {lesson && (
            <View style={styles.lessonCard}>
              <View style={[styles.lessonDot, { backgroundColor: lesson.color || colors.primary }]} />
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>
                  {TYPE_EMOJIS[lesson.type] ?? "📚"} {lesson.title}
                </Text>
                <Text style={styles.lessonMeta}>
                  {formatLessonDate(lesson.date)} · {lesson.startTime} · {lesson.duration} мин
                </Text>
              </View>
            </View>
          )}

          {/* ── Rating ── */}
          <Text style={styles.sectionLabel}>Оценка занятия</Text>
          <View style={styles.ratingRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const rc = ratingColor(n);
              const isSelected = rating === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.ratingCircle,
                    { borderColor: rc },
                    isSelected && { backgroundColor: rc },
                  ]}
                  onPress={() => setRating(n)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.ratingText,
                      { color: isSelected ? colors.white : rc },
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Child mood ── */}
          <Text style={styles.sectionLabel}>Состояние ребёнка</Text>
          <View style={styles.moodRow}>
            {CHILD_MOODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodBtn, childMood === m.value && styles.moodBtnActive]}
                onPress={() => setChildMood(m.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    childMood === m.value && styles.moodLabelActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Note ── */}
          <Text style={styles.sectionLabel}>Заметка</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Как вёл себя ребёнок? Что получилось?"
            placeholderTextColor={colors.textHint}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length}/500</Text>

          {/* ── Save ── */}
          <TouchableOpacity
            style={[
              commonStyles.buttonPrimary,
              styles.saveBtn,
              saving && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={commonStyles.buttonPrimaryText}>Сохранить заметку</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  lessonDot: {
    width: 14,
    height: 14,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  lessonInfo: { flex: 1 },
  lessonTitle: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  lessonMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // Rating
  ratingRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  ratingCircle: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingText: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 13,
  },

  // Child mood
  moodRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  moodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  moodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: "#EDE9FE",
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  moodLabelActive: {
    color: colors.primaryDark,
    fontWeight: "600",
  },

  // Note
  noteInput: {
    ...commonStyles.input,
    height: 120,
    color: colors.textPrimary,
  },
  charCount: {
    ...typography.caption,
    color: colors.textHint,
    textAlign: "right",
    marginTop: spacing.xs,
  },

  saveBtn: { marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.6 },
});
