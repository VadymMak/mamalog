import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import { commonStyles } from "../../theme/components";

// ─── Constants ────────────────────────────────────────────────────────────────

const LESSON_TYPES = [
  { value: "speech", label: "Логопед", emoji: "🗣️" },
  { value: "aba", label: "АВА", emoji: "🧩" },
  { value: "ergo", label: "Эрготерапия", emoji: "🤲" },
  { value: "school", label: "Школа", emoji: "🏫" },
  { value: "sensory", label: "Сенсорная", emoji: "🌀" },
  { value: "other", label: "Другое", emoji: "➕" },
] as const;

const LESSON_COLORS = [
  "#6B3FA0",
  "#E24B4A",
  "#1D9E75",
  "#EF9F27",
  "#378ADD",
  "#D85A30",
] as const;

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
type DurationOption = (typeof DURATION_OPTIONS)[number];

const REPEAT_OPTIONS = [
  { value: "none", label: "Не повторять" },
  { value: "daily", label: "Каждый день" },
  { value: "weekly", label: "По дням недели" },
  { value: "biweekly", label: "Раз в 2 недели" },
] as const;

const WEEK_DAYS = [
  { value: "mon", label: "Пн" },
  { value: "tue", label: "Вт" },
  { value: "wed", label: "Ср" },
  { value: "thu", label: "Чт" },
  { value: "fri", label: "Пт" },
  { value: "sat", label: "Сб" },
  { value: "sun", label: "Вс" },
] as const;

type WeekDay = (typeof WEEK_DAYS)[number]["value"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAYS_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_GENITIVE_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDisplayDate(d: Date): string {
  return `${DAYS_SHORT_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_GENITIVE_RU[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function roundedHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

// ─── AddLessonScreen ──────────────────────────────────────────────────────────

export default function AddLessonScreen() {
  const navigation = useNavigation();

  // ── Form state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [lessonType, setLessonType] = useState("speech");
  const [color, setColor] = useState<string>(LESSON_COLORS[0]);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(roundedHour);
  const [duration, setDuration] = useState<DurationOption>(45);
  const [repeat, setRepeat] = useState("none");
  const [repeatDays, setRepeatDays] = useState<WeekDay[]>([]);
  const [location, setLocation] = useState("");
  const [specialist, setSpecialist] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Picker visibility ───────────────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selected) setDate(selected);
  }

  function handleTimeChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selected) setTime(selected);
  }

  function stepDuration(dir: 1 | -1) {
    const idx = DURATION_OPTIONS.indexOf(duration);
    const next = DURATION_OPTIONS[Math.max(0, Math.min(DURATION_OPTIONS.length - 1, idx + dir))];
    if (next !== undefined) setDuration(next);
  }

  function toggleRepeatDay(day: WeekDay) {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Ошибка", "Введите название занятия");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/lessons", {
        title: title.trim(),
        type: lessonType,
        color,
        date: toISO(date),
        startTime: formatTime(time),
        duration,
        repeat,
        repeatDays: repeat === "weekly" ? repeatDays : [],
        location: location.trim() || undefined,
        specialist: specialist.trim() || undefined,
      });

      Alert.alert("Готово", "Занятие добавлено", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить занятие");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
          {/* ── Title ── */}
          <Text style={styles.sectionLabel}>Название занятия</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Логопед, АВА-терапия..."
            placeholderTextColor={colors.textHint}
            returnKeyType="done"
            maxLength={80}
          />

          {/* ── Type ── */}
          <Text style={styles.sectionLabel}>Тип занятия</Text>
          <View style={styles.chipsWrap}>
            {LESSON_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, lessonType === t.value && styles.chipActive]}
                onPress={() => setLessonType(t.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipEmoji}>{t.emoji}</Text>
                <Text
                  style={[styles.chipText, lessonType === t.value && styles.chipTextActive]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Color ── */}
          <Text style={styles.sectionLabel}>Цвет</Text>
          <View style={styles.colorsRow}>
            {LESSON_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  color === c && styles.colorCircleSelected,
                ]}
                onPress={() => setColor(c)}
                activeOpacity={0.8}
              >
                {color === c && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Date ── */}
          <Text style={styles.sectionLabel}>Дата</Text>
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.pickerRowText}>{formatDisplayDate(date)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
          </TouchableOpacity>

          {/* ── Time ── */}
          <Text style={styles.sectionLabel}>Время начала</Text>
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.pickerRowText}>{formatTime(time)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
          </TouchableOpacity>

          {/* ── Duration ── */}
          <Text style={styles.sectionLabel}>Продолжительность</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, DURATION_OPTIONS.indexOf(duration) === 0 && styles.stepperBtnDisabled]}
              onPress={() => stepDuration(-1)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={DURATION_OPTIONS.indexOf(duration) === 0 ? colors.textHint : colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{duration} мин</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, DURATION_OPTIONS.indexOf(duration) === DURATION_OPTIONS.length - 1 && styles.stepperBtnDisabled]}
              onPress={() => stepDuration(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={DURATION_OPTIONS.indexOf(duration) === DURATION_OPTIONS.length - 1 ? colors.textHint : colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Repeat ── */}
          <Text style={styles.sectionLabel}>Повторение</Text>
          <View style={styles.chipsWrap}>
            {REPEAT_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.chip, repeat === r.value && styles.chipActive]}
                onPress={() => setRepeat(r.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, repeat === r.value && styles.chipTextActive]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Repeat days ── */}
          {repeat === "weekly" && (
            <>
              <Text style={styles.sectionLabel}>Дни недели</Text>
              <View style={styles.weekDaysRow}>
                {WEEK_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[
                      styles.weekDayBtn,
                      repeatDays.includes(d.value) && styles.weekDayBtnActive,
                    ]}
                    onPress={() => toggleRepeatDay(d.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.weekDayText,
                        repeatDays.includes(d.value) && styles.weekDayTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Additional ── */}
          <Text style={styles.sectionLabel}>Дополнительно</Text>
          <TextInput
            style={[styles.input, styles.inputMarginBottom]}
            value={location}
            onChangeText={setLocation}
            placeholder="Место проведения (необязательно)"
            placeholderTextColor={colors.textHint}
            returnKeyType="next"
            maxLength={100}
          />
          <TextInput
            style={styles.input}
            value={specialist}
            onChangeText={setSpecialist}
            placeholder="Имя специалиста (необязательно)"
            placeholderTextColor={colors.textHint}
            returnKeyType="done"
            maxLength={80}
          />

          {/* ── Save button ── */}
          <TouchableOpacity
            style={[commonStyles.buttonPrimary, styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={commonStyles.buttonPrimaryText}>Сохранить занятие</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Date picker (Android: native dialog, iOS: modal spinner) ── */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {Platform.OS === "ios" && (
        <PickerModal
          visible={showDatePicker}
          title="Выберите дату"
          onDone={() => setShowDatePicker(false)}
        >
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            style={styles.iosPicker}
          />
        </PickerModal>
      )}

      {/* ── Time picker ── */}
      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour
          display="default"
          onChange={handleTimeChange}
        />
      )}
      {Platform.OS === "ios" && (
        <PickerModal
          visible={showTimePicker}
          title="Выберите время"
          onDone={() => setShowTimePicker(false)}
        >
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour
            display="spinner"
            onChange={handleTimeChange}
            style={styles.iosPicker}
          />
        </PickerModal>
      )}
    </SafeAreaView>
  );
}

// ─── PickerModal (iOS only) ───────────────────────────────────────────────────

function PickerModal({
  visible,
  title,
  onDone,
  children,
}: {
  visible: boolean;
  title: string;
  onDone: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDone}
    >
      <TouchableOpacity
        style={pickerModalStyles.overlay}
        onPress={onDone}
        activeOpacity={1}
      >
        <TouchableOpacity
          style={pickerModalStyles.sheet}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={pickerModalStyles.header}>
            <Text style={pickerModalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={pickerModalStyles.done}>Готово</Text>
            </TouchableOpacity>
          </View>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const pickerModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  done: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.primary,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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

  // Title input
  input: {
    ...commonStyles.input,
    color: colors.textPrimary,
  },
  inputMarginBottom: {
    marginBottom: spacing.sm,
  },

  // Type & repeat chips
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: "600",
  },

  // Color picker
  colorsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    borderColor: colors.white,
    ...shadows.md,
  },

  // Date / Time picker rows
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  pickerRowText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },

  // Duration stepper
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    alignSelf: "flex-start",
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    minWidth: 72,
    textAlign: "center",
  },

  // Week days
  weekDaysRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  weekDayBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  weekDayBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekDayText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  weekDayTextActive: {
    color: colors.white,
  },

  // Save button
  saveBtn: {
    marginTop: spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },

  // iOS picker
  iosPicker: {
    height: 200,
  },
});
