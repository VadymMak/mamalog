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
import type { NativeStackNavigationProp, RouteProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import type { BehaviorStackParamList } from "../../navigation/MainNavigator";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_KEYS = [
  "aggression", "avoidance", "stereotypies", "sensorOverload",
  "regression", "hyperactivity", "anxiety",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

const CATEGORY_VALUES: Record<CategoryKey, string> = {
  aggression:     "aggression",
  avoidance:      "avoidance",
  stereotypies:   "stereotypy",
  sensorOverload: "sensory_overload",
  regression:     "regression",
  hyperactivity:  "hyperactivity",
  anxiety:        "anxiety",
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

const CONTEXT_MAX = 200;
const TRIGGER_MAX = 200;

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewBehaviorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BehaviorStackParamList>>();
  const route = useRoute<RouteProp<BehaviorStackParamList, "NewBehavior">>();
  const logEntryId = route.params?.logEntryId;

  const [category, setCategory] = useState<CategoryKey>("aggression");
  const [context, setContext] = useState("");
  const [trigger, setTrigger] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  const intensityColor =
    intensity <= 3 ? colors.success :
    intensity <= 6 ? colors.warning : colors.sos;

  function handleVoiceRecord() {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      Alert.alert(t("common.error"), "Audio recording requires expo-audio setup.");
      setIsRecording(false);
    }
  }

  async function handleSave() {
    // category always has a value (default: "aggression"), but guard just in case
    if (!category) {
      Alert.alert(t("common.error"), t("newBehavior.selectCategoryError"));
      return;
    }
    setSaving(true);
    try {
      const durationParsed = duration.trim() !== "" ? parseInt(duration, 10) : undefined;
      await api.post("/api/behavior", {
        logEntryId,
        category: CATEGORY_VALUES[category],
        context: context.trim() || undefined,
        trigger: trigger.trim() || undefined,
        intensity,
        duration: durationParsed !== undefined && !isNaN(durationParsed) ? durationParsed : undefined,
      });
      navigation.goBack();
    } catch (err) {
      const msg = isAxiosError(err) && !err.response
        ? t("auth.errNoConnection")
        : t("newBehavior.saveError");
      Alert.alert(t("common.error"), msg);
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
        {/* Category grid */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>{t("newBehavior.selectCategory")}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_KEYS.map((key) => {
              const selected = category === key;
              const catColor = CATEGORY_COLORS[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryCard,
                    { borderColor: selected ? catColor : colors.border },
                    selected && { backgroundColor: catColor + "18" },
                  ]}
                  onPress={() => setCategory(key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.categoryLabel, selected && { color: catColor, fontWeight: "600" }]}>
                    {t(`behavior.categories.${key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Context */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>{t("newBehavior.contextLabel")}</Text>
          <TextInput
            style={styles.textArea}
            value={context}
            onChangeText={(text) => setContext(text.slice(0, CONTEXT_MAX))}
            placeholder={t("newBehavior.contextPlaceholder")}
            placeholderTextColor={colors.textHint}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>
            {CONTEXT_MAX - context.length} {t("newBehavior.charsLeft")}
          </Text>
        </View>

        {/* Trigger + Voice */}
        <View style={commonStyles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitleInline}>{t("newBehavior.triggerLabel")}</Text>
            <TouchableOpacity
              style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
              onPress={handleVoiceRecord}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic-outline"}
                size={16}
                color={isRecording ? colors.sos : colors.primary}
              />
              <Text style={[styles.voiceBtnText, isRecording && styles.voiceBtnTextActive]}>
                {isRecording ? t("newBehavior.voiceRecording") : t("newBehavior.voiceRecord")}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textArea}
            value={trigger}
            onChangeText={(text) => setTrigger(text.slice(0, TRIGGER_MAX))}
            placeholder={t("newBehavior.triggerPlaceholder")}
            placeholderTextColor={colors.textHint}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>
            {TRIGGER_MAX - trigger.length} {t("newBehavior.charsLeft")}
          </Text>
        </View>

        {/* Intensity */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>
            {t("newBehavior.intensityLabel")}:{" "}
            <Text style={{ color: intensityColor, fontWeight: "700" }}>{intensity}/10</Text>
          </Text>
          <View style={styles.intensityRow}>
            {Array.from({ length: 10 }, (_, i) => {
              const val = i + 1;
              const segColor =
                val <= 3 ? colors.success :
                val <= 6 ? colors.warning : colors.sos;
              const filled = val <= intensity;
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.intensityBtn,
                    { backgroundColor: filled ? segColor : colors.surfaceSecondary },
                    val === intensity && styles.intensityBtnActive,
                  ]}
                  onPress={() => setIntensity(val)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.intensityBtnText, { color: filled ? colors.white : colors.textHint }]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Duration */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>{t("newBehavior.durationLabel")}</Text>
          <TextInput
            style={commonStyles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder={t("newBehavior.durationPlaceholder")}
            placeholderTextColor={colors.textHint}
            keyboardType="number-pad"
            maxLength={4}
          />
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
            <Text style={styles.saveBtnText}>{t("newBehavior.save")}</Text>
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
  sectionTitleInline: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  categoryLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 80,
    lineHeight: 22,
  },
  charCounter: {
    ...typography.caption,
    color: colors.textHint,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
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
  intensityRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  intensityBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  intensityBtnActive: { ...shadows.sm },
  intensityBtnText: { ...typography.caption, fontWeight: "600" },
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
