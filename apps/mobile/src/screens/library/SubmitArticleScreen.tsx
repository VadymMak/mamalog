import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import { API_URL } from "../../lib/constants";
import { getAuthHeaders } from "../../lib/api";

const CATEGORIES = [
  { key: "Речь", label: "Речь" },
  { key: "Эмоции", label: "Эмоции" },
  { key: "Поведение", label: "Поведение" },
  { key: "Мама", label: "Мама" },
  { key: "Сенсорика", label: "Сенсорика" },
  { key: "Другое", label: "Другое" },
];

export default function SubmitArticleScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Поведение");
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert(t("submitArticle.error"), t("submitArticle.titleRequired"));
      return;
    }
    if (content.trim().length < 100) {
      Alert.alert(t("submitArticle.error"), t("submitArticle.contentTooShort"));
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/articles/submit`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, authorName: authorName.trim() || undefined }),
      });

      const json = await res.json() as { success: boolean; status?: string; message?: string; reason?: string };

      if (json.success) {
        const isApproved = json.status === "approved";
        Alert.alert(
          isApproved ? t("submitArticle.publishedTitle") : t("submitArticle.pendingTitle"),
          json.message ?? (isApproved ? t("submitArticle.publishedMsg") : t("submitArticle.pendingMsg")),
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          t("submitArticle.rejectedTitle"),
          json.reason ?? t("submitArticle.rejectedMsg")
        );
      }
    } catch {
      Alert.alert(t("submitArticle.error"), t("submitArticle.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("submitArticle.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t("submitArticle.subtitle")}</Text>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>{t("submitArticle.articleTitle")} *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t("submitArticle.titlePlaceholder")}
            placeholderTextColor={colors.textHint}
            maxLength={200}
          />
        </View>

        {/* Author name (optional) */}
        <View style={styles.field}>
          <Text style={styles.label}>{t("submitArticle.authorName")}</Text>
          <TextInput
            style={styles.input}
            value={authorName}
            onChangeText={setAuthorName}
            placeholder={t("submitArticle.authorNamePlaceholder")}
            placeholderTextColor={colors.textHint}
            maxLength={100}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>{t("submitArticle.category")}</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, category === c.key && styles.chipActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.field}>
          <Text style={styles.label}>{t("submitArticle.content")} *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={content}
            onChangeText={setContent}
            placeholder={t("submitArticle.contentPlaceholder")}
            placeholderTextColor={colors.textHint}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length} {t("submitArticle.chars")}</Text>
        </View>

        {/* AI note */}
        <View style={styles.infoBox}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={styles.infoText}>{t("submitArticle.aiNote")}</Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>{t("submitArticle.submit")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },

  field: { gap: 6 },
  label: { ...typography.caption, color: colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
    ...shadows.sm,
  },
  textarea: { minHeight: 200, paddingTop: 12 },
  charCount: { ...typography.caption, color: colors.textHint, alignSelf: "flex-end" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: "500" },
  chipTextActive: { color: colors.white, fontWeight: "600" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  infoText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    ...shadows.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { ...typography.button, color: colors.white },
});
