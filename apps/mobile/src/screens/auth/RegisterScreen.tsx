import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import { useAuthContext } from "../../context/AuthContext";
import { useLanguageContext } from "../../context/LanguageContext";
import { colors, spacing, borderRadius, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import { AppLogo } from "../../components/common/AppLogo";
import { FormInput } from "../../components/common/FormInput";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { LanguageSwitcher } from "../../components/common/LanguageSwitcher";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterResponse {
  success: boolean;
  data: { id: string; email: string; name: string | null; role: string };
}

interface LoginResponse {
  success: boolean;
  data: { id: string; email: string; name: string | null; role: string };
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

type PasswordStrength = "weak" | "medium" | "strong";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (hasNumber && hasSpecial) return "strong";
  return "medium";
}

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: colors.error,
  medium: colors.warning,
  strong: colors.success,
};

// ─── Password strength bar ────────────────────────────────────────────────────

interface StrengthBarProps {
  password: string;
}

function StrengthBar({ password }: StrengthBarProps) {
  const { t } = useTranslation();
  if (password.length === 0) return null;

  const strength = getPasswordStrength(password);
  const fill = strength === "weak" ? 1 : strength === "medium" ? 2 : 3;
  const color = STRENGTH_COLOR[strength];
  const label =
    strength === "weak"
      ? t("auth.strengthWeak")
      : strength === "medium"
        ? t("auth.strengthMedium")
        : t("auth.strengthStrong");

  return (
    <View style={strengthStyles.container}>
      <View style={strengthStyles.barsRow}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={[
              strengthStyles.bar,
              { backgroundColor: n <= fill ? color : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[strengthStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const strengthStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: borderRadius.full,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
    minWidth: 50,
    textAlign: "right",
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn } = useAuthContext();
  const { language } = useLanguageContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: FormErrors = {};
    if (name.trim().length < 2) next.name = t("auth.errNameShort");
    if (!validateEmail(email)) next.email = t("auth.errInvalidEmail");
    if (password.length < 8) next.password = t("auth.errPasswordShort");
    if (password !== confirmPassword) next.confirmPassword = t("auth.errPasswordMismatch");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post<RegisterResponse>("/api/auth/register", {
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        language,
      });

      // Auto-login after registration
      const loginRes = await api.post<LoginResponse>("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { id, email: userEmail, name: userName, role } = loginRes.data.data;
      await signIn({ id, email: userEmail, name: userName, role }, id);
    } catch (err) {
      if (isAxiosError(err)) {
        if (!err.response) {
          setFormError(t("auth.errNoConnection"));
        } else if (err.response.status === 409) {
          setFormError(t("auth.errUserExists"));
        } else {
          setFormError(t("auth.errGeneric"));
        }
      } else {
        setFormError(t("auth.errGeneric"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("Login")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Logo + Title */}
          <View style={styles.topSection}>
            <AppLogo size={64} />
            <Text style={styles.title}>{t("auth.createAccount")}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label={t("auth.name")}
              value={name}
              onChangeText={setName}
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              placeholder={t("auth.namePlaceholder")}
            />

            <FormInput
              label={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
            />

            <FormInput
              label={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              secureToggle
              placeholder={t("auth.passwordPlaceholder")}
            />
            <StrengthBar password={password} />

            <FormInput
              label={t("auth.confirmPassword")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              secureTextEntry
              secureToggle
              placeholder={t("auth.passwordPlaceholder")}
            />

            {/* Language selector */}
            <View style={styles.langSection}>
              <Text style={styles.langLabel}>Language / Язык</Text>
              <LanguageSwitcher />
            </View>

            {formError ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={t("auth.register")}
              onPress={handleRegister}
              loading={loading}
              style={styles.registerBtn}
            />
          </View>

          {/* Bottom link */}
          <View style={styles.bottom}>
            <View style={styles.loginRow}>
              <Text style={styles.haveAccountText}>
                {t("auth.alreadyHaveAccount")}{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>{t("auth.goLogin")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  backBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: "flex-start",
    padding: spacing.xs,
  },
  topSection: {
    alignItems: "center",
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.xs,
  },
  langSection: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  langLabel: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  formErrorBox: {
    backgroundColor: "#FFF5F5",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  formErrorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: "center",
  },
  registerBtn: {
    marginTop: spacing.sm,
  },
  bottom: {
    marginTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  haveAccountText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
});
