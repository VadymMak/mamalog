import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import type { DiaryStackParamList } from "../../navigation/MainNavigator";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_EMOJIS = [
  { emoji: "😢", score: 1 }, { emoji: "😔", score: 2 }, { emoji: "😕", score: 3 },
  { emoji: "😐", score: 4 }, { emoji: "🙂", score: 5 }, { emoji: "😌", score: 6 },
  { emoji: "😊", score: 7 }, { emoji: "😄", score: 8 }, { emoji: "🤩", score: 9 },
  { emoji: "🌟", score: 10 },
] as const;

const ENERGY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const EMOTION_KEYS = ["joy", "sadness", "anxiety", "anger", "calm", "tiredness", "pride"] as const;
const TRIGGER_KEYS = ["kindergarten", "noise", "food", "sleepTrigger", "newPeople", "routineChange", "tiredness"] as const;

type EmotionKey = (typeof EMOTION_KEYS)[number];
type TriggerKey = (typeof TRIGGER_KEYS)[number];

const NOTES_MAX = 500;

// ─── Chip ─────────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[commonStyles.tag, selected && commonStyles.tagSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[commonStyles.tagText, selected && commonStyles.tagTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewLogScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<DiaryStackParamList>>();
  const route = useRoute<RouteProp<DiaryStackParamList, "NewLog">>();

  const [moodScore, setMoodScore] = useState(route.params?.initialMoodScore ?? 5);
  const [selectedEmotions, setSelectedEmotions] = useState<Set<string>>(new Set());
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set());
  const [sleepHours, setSleepHours] = useState("");
  const [energyLevel, setEnergyLevel] = useState(5);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { isRecording, isTranscribing, toggle: toggleVoice } = useVoiceRecorder({
    language: i18n.language,
    onTranscript: (text) => setNotes((prev) => prev ? `${prev} ${text}` : text),
  });

  function toggleEmotion(key: EmotionKey) {
    const label = t(`newLog.tags.${key}`);
    setSelectedEmotions((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  function toggleTrigger(key: TriggerKey) {
    const label = t(`newLog.tags.${key}`);
    setSelectedTriggers((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const sleepParsed = sleepHours.trim() !== "" ? parseFloat(sleepHours) : undefined;
      await api.post("/api/log", {
        moodScore,
        emotions: Array.from(selectedEmotions),
        triggers: Array.from(selectedTriggers),
        sleepHours: sleepParsed !== undefined && !isNaN(sleepParsed) ? sleepParsed : undefined,
        energyLevel,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch {
      Alert.alert(t("common.error"), t("newLog.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mood */}
        <View style={commonStyles.card}>
          <SectionTitle label={t("newLog.mood")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
            {MOOD_EMOJIS.map(({ emoji, score }) => (
              <TouchableOpacity
                key={score}
                style={[styles.moodBtn, moodScore === score && styles.moodBtnSelected]}
                onPress={() => setMoodScore(score)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodScoreText}>{score}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Emotions */}
        <View style={commonStyles.card}>
          <SectionTitle label={t("newLog.emotionLabel")} />
          <View style={styles.chipWrap}>
            {EMOTION_KEYS.map((key) => {
              const label = t(`newLog.tags.${key}`);
              return (
                <Chip key={key} label={label} selected={selectedEmotions.has(label)} onPress={() => toggleEmotion(key)} />
              );
            })}
          </View>
        </View>

        {/* Triggers */}
        <View style={commonStyles.card}>
          <SectionTitle label={t("newLog.triggersLabel")} />
          <View style={styles.chipWrap}>
            {TRIGGER_KEYS.map((key) => {
              const label = t(`newLog.tags.${key}`);
              return (
                <Chip key={key} label={label} selected={selectedTriggers.has(label)} onPress={() => toggleTrigger(key)} />
              );
            })}
          </View>
        </View>

        {/* Sleep */}
        <View style={commonStyles.card}>
          <SectionTitle label={t("newLog.sleepHours")} />
          <TextInput
            style={commonStyles.input}
            value={sleepHours}
            onChangeText={setSleepHours}
            placeholder={t("newLog.sleepPlaceholder")}
            placeholderTextColor={colors.textHint}
            keyboardType="decimal-pad"
            maxLength={4}
          />
        </View>

        {/* Energy */}
        <View style={commonStyles.card}>
          <SectionTitle label={t("newLog.energyLevel")} />
          <View style={styles.energyRow}>
            {ENERGY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.energyBtn, energyLevel === level && styles.energyBtnSelected]}
                onPress={() => setEnergyLevel(level)}
                activeOpacity={0.7}
              >
                <Text style={[styles.energyBtnText, energyLevel === level && styles.energyBtnTextSelected]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes + Voice */}
        <View style={commonStyles.card}>
          <View style={styles.notesHeader}>
            <SectionTitle label={t("newLog.notes")} />
            <TouchableOpacity
              style={[styles.voiceBtn, (isRecording || isTranscribing) && styles.voiceBtnActive]}
              onPress={toggleVoice}
              disabled={isTranscribing}
              activeOpacity={0.8}
            >
              {isTranscribing ? (
                <ActivityIndicator size={14} color={colors.sos} />
              ) : (
                <Ionicons
                  name={isRecording ? "stop-circle" : "mic-outline"}
                  size={16}
                  color={isRecording ? colors.sos : colors.primary}
                />
              )}
              <Text style={[styles.voiceBtnText, (isRecording || isTranscribing) && styles.voiceBtnTextActive]}>
                {isTranscribing
                  ? t("newLog.voiceTranscribing")
                  : isRecording
                  ? t("newLog.voiceRecording")
                  : t("newLog.voiceRecord")}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={(text) => setNotes(text.slice(0, NOTES_MAX))}
            placeholder={t("newLog.notesPlaceholder")}
            placeholderTextColor={colors.textHint}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>
            {NOTES_MAX - notes.length} {t("newLog.charsLeft")}
          </Text>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>{t("common.save")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  sectionTitle: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  moodRow: { gap: spacing.sm, paddingBottom: 2 },
  moodBtn: {
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.background,
    minWidth: 52,
  },
  moodBtnSelected: { borderColor: colors.primary, backgroundColor: "#EDE9FE" },
  moodEmoji: { fontSize: 24 },
  moodScoreText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  energyRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  energyBtn: {
    flex: 1,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  energyBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  energyBtnText: { ...typography.caption, color: colors.textSecondary, fontWeight: "500" },
  energyBtnTextSelected: { color: colors.white, fontWeight: "700" },
  notesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  voiceBtnActive: { borderColor: colors.sos, backgroundColor: colors.sosLight },
  voiceBtnText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  voiceBtnTextActive: { color: colors.sos },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 100,
    lineHeight: 22,
  },
  charCounter: { ...typography.caption, color: colors.textHint, textAlign: "right", marginTop: spacing.xs },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
    ...shadows.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { ...typography.button, color: colors.white },
});
