import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { colors } from "../../lib/colors";
import type { DiaryStackParamList } from "../../navigation/MainNavigator";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_EMOJIS: { emoji: string; score: number }[] = [
  { emoji: "😢", score: 1 },
  { emoji: "😔", score: 2 },
  { emoji: "😕", score: 3 },
  { emoji: "😐", score: 4 },
  { emoji: "🙂", score: 5 },
  { emoji: "😌", score: 6 },
  { emoji: "😊", score: 7 },
  { emoji: "😄", score: 8 },
  { emoji: "🤩", score: 9 },
  { emoji: "🌟", score: 10 },
];

const ENERGY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const EMOTION_KEYS = [
  "joy",
  "sadness",
  "anxiety",
  "anger",
  "calm",
  "tiredness",
  "pride",
] as const;

const TRIGGER_KEYS = [
  "kindergarten",
  "noise",
  "food",
  "sleepTrigger",
  "newPeople",
  "routineChange",
  "tiredness",
] as const;

type EmotionKey = (typeof EMOTION_KEYS)[number];
type TriggerKey = (typeof TRIGGER_KEYS)[number];

const NOTES_MAX = 500;

// ─── Chip component ───────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewLogScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<DiaryStackParamList>>();

  const [moodScore, setMoodScore] = useState<number>(5);
  const [selectedEmotions, setSelectedEmotions] = useState<Set<string>>(new Set());
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set());
  const [sleepHours, setSleepHours] = useState<string>("");
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function handleVoiceRecord() {
    // TODO: implement audio recording with expo-audio
    // On completion: POST /api/voice with audio file → get transcript → set notes
    setIsRecording((prev) => !prev);
    if (isRecording) {
      setIsRecording(false);
      Alert.alert(
        t("common.error"),
        "Audio recording requires expo-audio setup. Coming soon."
      );
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const sleepParsed = sleepHours.trim() !== "" ? parseFloat(sleepHours) : undefined;
      await api.post("/api/log", {
        moodScore,
        emotions: Array.from(selectedEmotions),
        triggers: Array.from(selectedTriggers),
        sleepHours:
          sleepParsed !== undefined && !isNaN(sleepParsed)
            ? sleepParsed
            : undefined,
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

  const notesRemaining = NOTES_MAX - notes.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mood */}
        <View style={styles.card}>
          <SectionTitle label={t("newLog.mood")} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodRow}
          >
            {MOOD_EMOJIS.map(({ emoji, score }) => (
              <TouchableOpacity
                key={score}
                style={[
                  styles.moodBtn,
                  moodScore === score && styles.moodBtnSelected,
                ]}
                onPress={() => setMoodScore(score)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodScore}>{score}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Emotions */}
        <View style={styles.card}>
          <SectionTitle label={t("newLog.emotionLabel")} />
          <View style={styles.chipWrap}>
            {EMOTION_KEYS.map((key) => {
              const label = t(`newLog.tags.${key}`);
              return (
                <Chip
                  key={key}
                  label={label}
                  selected={selectedEmotions.has(label)}
                  onPress={() => toggleEmotion(key)}
                />
              );
            })}
          </View>
        </View>

        {/* Triggers */}
        <View style={styles.card}>
          <SectionTitle label={t("newLog.triggersLabel")} />
          <View style={styles.chipWrap}>
            {TRIGGER_KEYS.map((key) => {
              const label = t(`newLog.tags.${key}`);
              return (
                <Chip
                  key={key}
                  label={label}
                  selected={selectedTriggers.has(label)}
                  onPress={() => toggleTrigger(key)}
                />
              );
            })}
          </View>
        </View>

        {/* Sleep + Energy */}
        <View style={styles.card}>
          <SectionTitle label={t("newLog.sleepHours")} />
          <TextInput
            style={styles.numberInput}
            value={sleepHours}
            onChangeText={setSleepHours}
            placeholder={t("newLog.sleepPlaceholder")}
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            maxLength={4}
          />
        </View>

        <View style={styles.card}>
          <SectionTitle label={t("newLog.energyLevel")} />
          <View style={styles.energyRow}>
            {ENERGY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.energyBtn,
                  energyLevel === level && styles.energyBtnSelected,
                ]}
                onPress={() => setEnergyLevel(level)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.energyBtnText,
                    energyLevel === level && styles.energyBtnTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes + Voice */}
        <View style={styles.card}>
          <View style={styles.notesHeader}>
            <SectionTitle label={t("newLog.notes")} />
            <TouchableOpacity
              style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
              onPress={handleVoiceRecord}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic-outline"}
                size={18}
                color={isRecording ? colors.sos : colors.primary}
              />
              <Text
                style={[
                  styles.voiceBtnText,
                  isRecording && styles.voiceBtnTextActive,
                ]}
              >
                {isRecording ? t("newLog.voiceRecording") : t("newLog.voiceRecord")}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={(text) => setNotes(text.slice(0, NOTES_MAX))}
            placeholder={t("newLog.notesPlaceholder")}
            placeholderTextColor={colors.placeholder}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>
            {notesRemaining} {t("newLog.charsLeft")}
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  moodRow: {
    gap: 8,
    paddingBottom: 2,
  },
  moodBtn: {
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.background,
    minWidth: 52,
  },
  moodBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: "#EDE9FE",
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodScore: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: "#EDE9FE",
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  numberInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  energyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  energyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  energyBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  energyBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  energyBtnTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  notesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  voiceBtnActive: {
    borderColor: colors.sos,
    backgroundColor: "#FFF5F5",
  },
  voiceBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  voiceBtnTextActive: {
    color: colors.sos,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 100,
    lineHeight: 22,
  },
  charCounter: {
    fontSize: 12,
    color: colors.placeholder,
    textAlign: "right",
    marginTop: 6,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
