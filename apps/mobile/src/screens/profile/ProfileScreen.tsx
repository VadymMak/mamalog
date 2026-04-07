import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../hooks/useLanguage";
import { useProfile } from "../../hooks/useProfile";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { APP_VERSION } from "../../lib/constants";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user: authUser, signOut } = useAuthContext();
  const { language, setLanguage } = useLanguage();
  const { user, loading, refetch } = useProfile();

  // Child info form state (local, synced from API)
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Sync form when API data arrives
  React.useEffect(() => {
    if (user) {
      setChildName(user.childName ?? "");
      setChildAge(user.childAge != null ? String(user.childAge) : "");
      setDiagnosis(user.diagnosis ?? "");
    }
  }, [user]);

  // ── Derived values ───────────────────────────────────────────────────────
  const initials = (authUser?.name ?? authUser?.email ?? "?")
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const isPremium =
    user?.subscription?.plan === "MONTHLY" ||
    user?.subscription?.plan === "YEARLY";

  // ── Save child info ──────────────────────────────────────────────────────
  const handleSaveChild = useCallback(async () => {
    setSaving(true);
    try {
      await api.patch("/api/user", {
        childName: childName.trim() || null,
        childAge: childAge ? parseInt(childAge, 10) : null,
        diagnosis: diagnosis.trim() || null,
      });
      refetch();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      Alert.alert(t("common.error"), t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  }, [childName, childAge, diagnosis, refetch, t]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    Alert.alert(t("profile.logoutConfirmTitle"), t("profile.logoutConfirmMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }, [signOut, t]);

  // ── Language toggle ──────────────────────────────────────────────────────
  const handleLanguage = useCallback(() => {
    Alert.alert(t("profile.settingsLanguage"), "", [
      { text: "Русский", onPress: () => setLanguage("ru") },
      { text: "English", onPress: () => setLanguage("en") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }, [setLanguage, t]);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar section ──────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{authUser?.name ?? t("profile.noName")}</Text>
          <Text style={styles.userEmail}>{authUser?.email}</Text>
          <View style={[styles.subBadge, isPremium ? styles.subBadgePremium : styles.subBadgeFree]}>
            {isPremium && <Ionicons name="star" size={12} color={colors.white} />}
            <Text style={[styles.subBadgeText, isPremium && { color: colors.white }]}>
              {isPremium ? t("profile.subscriptionPremium") : t("profile.subscriptionFree")}
            </Text>
          </View>
        </View>

        {/* ── Stats row ───────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.stats.diaryDays ?? 0}</Text>
            <Text style={styles.statLabel}>{t("profile.statsDays")}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardCenter]}>
            <Text style={styles.statValue}>{user?.stats.totalEntries ?? 0}</Text>
            <Text style={styles.statLabel}>{t("profile.statsEntries")}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.stats.episodes ?? 0}</Text>
            <Text style={styles.statLabel}>{t("profile.statsEpisodes")}</Text>
          </View>
        </View>

        {/* ── Child info ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.childSection")}</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("profile.childName")}</Text>
              <TextInput
                style={styles.input}
                value={childName}
                onChangeText={setChildName}
                placeholder={t("profile.childNamePlaceholder")}
                placeholderTextColor={colors.textHint}
                returnKeyType="next"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("profile.childAge")}</Text>
              <TextInput
                style={styles.input}
                value={childAge}
                onChangeText={setChildAge}
                placeholder="5"
                placeholderTextColor={colors.textHint}
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("profile.childDiagnosis")}</Text>
              <TextInput
                style={styles.input}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder={t("profile.childDiagnosisOptional")}
                placeholderTextColor={colors.textHint}
                returnKeyType="done"
              />
            </View>
            {saveSuccess && (
              <View style={styles.successToast}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.successToastText}>Сохранено</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveChild}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>{t("profile.saveChild")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Settings list ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.settingsSection")}</Text>
          <View style={styles.card}>
            {/* Language */}
            <TouchableOpacity style={styles.settingRow} onPress={handleLanguage} activeOpacity={0.75}>
              <Ionicons name="language-outline" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>{t("profile.settingsLanguage")}</Text>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{language.toUpperCase()}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Notifications */}
            <View style={styles.settingRow}>
              <Ionicons name="notifications-outline" size={20} color={colors.textHint} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t("profile.settingsNotifications")}</Text>
                <Text style={styles.settingComingSoon}>
                  Уведомления будут доступны в следующей версии
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Export */}
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.75}>
              <Ionicons name="download-outline" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>{t("profile.settingsExport")}</Text>
              <View style={styles.settingRight}>
                <Text style={styles.settingComingSoon}>{t("profile.comingSoon")}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Privacy */}
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.75}>
              <Ionicons name="shield-outline" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>{t("profile.settingsPrivacy")}</Text>
              <View style={styles.settingRight}>
                <Text style={styles.settingComingSoon}>{t("profile.comingSoon")}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* About */}
            <View style={styles.settingRow}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>{t("profile.settingsAbout")}</Text>
              <Text style={styles.settingValue}>v{APP_VERSION}</Text>
            </View>
          </View>
        </View>

        {/* ── Logout ──────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t("profile.logout")}</Text>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
    marginBottom: spacing.xs,
  },
  avatarInitials: {
    ...typography.h2,
    color: colors.white,
    fontWeight: "700",
  },
  userName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  subBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  subBadgeFree: {
    backgroundColor: colors.surfaceSecondary,
  },
  subBadgePremium: {
    backgroundColor: colors.primary,
  },
  subBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
    ...shadows.sm,
  },
  statCardCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "700",
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 14,
  },
  // Sections
  section: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  // Fields
  fieldGroup: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  saveBtn: {
    margin: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    ...shadows.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.button,
    color: colors.white,
  },
  successToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: "#F0FFF4",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: "#9AE6B4",
  },
  successToastText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "600",
  },
  // Settings rows
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  settingLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  settingValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  settingComingSoon: {
    ...typography.caption,
    color: colors.textHint,
    fontStyle: "italic",
  },
  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  logoutText: {
    ...typography.button,
    color: colors.error,
  },
});
