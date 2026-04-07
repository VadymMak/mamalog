import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import { FormInput } from "../../components/common/FormInput";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { API_URL } from "../../lib/constants";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIALTIES = [
  "Психолог",
  "Логопед",
  "Эрготерапевт",
  "Дефектолог",
  "Нейропсихолог",
  "Психотерапевт",
  "Другое",
] as const;

type Specialty = (typeof SPECIALTIES)[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  specialty?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SpecialistRegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "">("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [diplomaUrl, setDiplomaUrl] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const next: FormErrors = {};
    if (name.trim().length < 2) next.name = t("specialist.errNameShort");
    if (!validateEmail(email)) next.email = t("auth.errInvalidEmail");
    if (password.length < 8) next.password = t("auth.errPasswordShort");
    if (!specialty) next.specialty = t("specialist.errSpecialtyRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Specialty picker ──────────────────────────────────────────────────────
  const handleSpecialtyPick = useCallback(() => {
    Alert.alert(
      t("specialist.specialty"),
      "",
      [
        ...SPECIALTIES.map((s) => ({
          text: s,
          onPress: () => setSpecialty(s),
        })),
        { text: t("common.cancel"), style: "cancel" as const },
      ]
    );
  }, [t]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/specialist/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          specialty,
          bio: bio.trim() || undefined,
          experience: experience ? parseInt(experience, 10) : undefined,
          diplomaUrl: diplomaUrl.trim() || undefined,
          language: "ru",
        }),
      });
      const json = await res.json();

      if (json.success) {
        Alert.alert(
          t("specialist.successTitle"),
          t("specialist.successMessage"),
          [{ text: "OK", onPress: () => navigation.navigate("Login") }]
        );
      } else if (res.status === 409) {
        setFormError(t("auth.errUserExists"));
      } else {
        setFormError(json.error ?? t("auth.errGeneric"));
      }
    } catch {
      setFormError(t("auth.errNoConnection"));
    } finally {
      setLoading(false);
    }
  }, [name, email, password, specialty, bio, experience, diplomaUrl, navigation, t, submitted]);

  const bioCharsLeft = 500 - bio.length;

  return (
    <SafeAreaView style={commonStyles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("specialist.registerTitle")}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoBannerText}>{t("specialist.infoBanner")}</Text>
          </View>

          {/* ── Photo placeholder ─────────────────────────────── */}
          <View style={styles.photoSection}>
            <View style={styles.photoCircle}>
              <Ionicons name="camera-outline" size={32} color={colors.textHint} />
            </View>
            <Text style={styles.photoLabel}>{t("specialist.addPhoto")}</Text>
          </View>

          {/* ── Form ─────────────────────────────────────────── */}
          <View style={styles.form}>
            <FormInput
              label={t("specialist.fullName")}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (submitted) {
                  setErrors((e) => ({
                    ...e,
                    name: text.trim().length < 2 ? t("specialist.errNameShort") : undefined,
                  }));
                }
              }}
              error={errors.name}
              placeholder={t("specialist.fullNamePlaceholder")}
              autoCapitalize="words"
            />

            <FormInput
              label={t("auth.email")}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (submitted) {
                  setErrors((e) => ({
                    ...e,
                    email: !validateEmail(text) ? t("auth.errInvalidEmail") : undefined,
                  }));
                }
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={t("auth.emailPlaceholder")}
            />

            <FormInput
              label={t("auth.password")}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (submitted) {
                  setErrors((e) => ({
                    ...e,
                    password: text.length < 8 ? t("auth.errPasswordShort") : undefined,
                  }));
                }
              }}
              error={errors.password}
              secureTextEntry
              secureToggle
              placeholder={t("auth.passwordPlaceholder")}
            />

            {/* Specialty selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("specialist.specialty")}</Text>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  errors.specialty ? styles.selectorBtnError : null,
                ]}
                onPress={handleSpecialtyPick}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !specialty && styles.selectorPlaceholder,
                  ]}
                >
                  {specialty || t("specialist.specialtyPlaceholder")}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textHint} />
              </TouchableOpacity>
              {errors.specialty ? (
                <Text style={styles.errorText}>{errors.specialty}</Text>
              ) : null}
            </View>

            {/* Bio textarea */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("specialist.bio")}</Text>
              <View style={styles.textareaWrapper}>
                <TextInput
                  style={styles.textarea}
                  value={bio}
                  onChangeText={(text) => setBio(text.slice(0, 500))}
                  placeholder={t("specialist.bioPlaceholder")}
                  placeholderTextColor={colors.textHint}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charsLeft}>{bioCharsLeft}</Text>
              </View>
            </View>

            {/* Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("specialist.experience")}</Text>
              <TextInput
                style={styles.singleInput}
                value={experience}
                onChangeText={setExperience}
                placeholder={t("specialist.experiencePlaceholder")}
                placeholderTextColor={colors.textHint}
                keyboardType="number-pad"
              />
            </View>

            {/* Diploma URL */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("specialist.diplomaUrl")}</Text>
              <TextInput
                style={styles.singleInput}
                value={diplomaUrl}
                onChangeText={setDiplomaUrl}
                placeholder={t("specialist.diplomaUrlPlaceholder")}
                placeholderTextColor={colors.textHint}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Form-level error */}
            {formError ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={t("specialist.submit")}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>

          {/* Bottom: already have account */}
          <View style={styles.bottom}>
            <Text style={styles.loginText}>{t("specialist.alreadyHaveAccount")} </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>{t("auth.goLogin")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#EBF4FF",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#BEE3F8",
  },
  infoBannerText: {
    ...typography.bodySmall,
    color: "#2B6CB0",
    flex: 1,
    lineHeight: 20,
  },
  photoSection: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  photoCircle: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoLabel: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
  form: {
    gap: spacing.xs,
  },
  fieldGroup: {
    gap: 6,
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  selectorBtnError: {
    borderColor: colors.error,
  },
  selectorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  selectorPlaceholder: {
    color: colors.textHint,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  textareaWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  textarea: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    minHeight: 90,
    textAlignVertical: "top",
  },
  charsLeft: {
    ...typography.caption,
    color: colors.textHint,
    textAlign: "right",
    marginTop: 4,
  },
  singleInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  formErrorBox: {
    backgroundColor: "#FFF5F5",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  formErrorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: "center",
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  loginText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
});
