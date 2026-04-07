import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import { useAuthContext } from "../../context/AuthContext";
import { colors, spacing, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import { AppLogo } from "../../components/common/AppLogo";
import { FormInput } from "../../components/common/FormInput";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { LanguageSwitcher } from "../../components/common/LanguageSwitcher";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  language: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn } = useAuthContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!validateEmail(email)) next.email = t("auth.errInvalidEmail");
    if (password.length < 8) next.password = t("auth.errPasswordShort");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleEmailChange(text: string) {
    setEmail(text);
    if (submitted && !validateEmail(text)) {
      setErrors((e) => ({ ...e, email: t("auth.errInvalidEmail") }));
    } else {
      setErrors((e) => ({ ...e, email: undefined }));
    }
  }

  function handlePasswordChange(text: string) {
    setPassword(text);
    if (submitted && text.length < 8) {
      setErrors((e) => ({ ...e, password: t("auth.errPasswordShort") }));
    } else {
      setErrors((e) => ({ ...e, password: undefined }));
    }
  }

  async function handleLogin() {
    setSubmitted(true);
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { id, email: userEmail, name, role } = res.data.data;
      // Token placeholder: using user.id until mobile JWT endpoint is added
      await signIn({ id, email: userEmail, name, role }, id);
      // AppNavigator will automatically switch to MainNavigator via isAuthenticated
    } catch (err) {
      if (isAxiosError(err)) {
        if (!err.response) {
          setFormError(t("auth.errNoConnection"));
        } else if (err.response.status === 401) {
          setFormError(t("auth.errInvalidCredentials"));
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
          {/* Logo + Title */}
          <View style={styles.topSection}>
            <AppLogo size={80} />
            <Text style={styles.appName}>{t("auth.appName")}</Text>
            <Text style={styles.subtitle}>{t("auth.loginSubtitle")}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label={t("auth.email")}
              value={email}
              onChangeText={handleEmailChange}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
            />

            <FormInput
              label={t("auth.password")}
              value={password}
              onChangeText={handlePasswordChange}
              error={errors.password}
              secureTextEntry
              secureToggle
              placeholder={t("auth.passwordPlaceholder")}
            />

            {formError ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={t("auth.login")}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />
          </View>

          {/* Bottom */}
          <View style={styles.bottom}>
            <View style={styles.registerRow}>
              <Text style={styles.noAccountText}>{t("auth.noAccount")} </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerLink}>{t("auth.goRegister")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.langRow}>
              <LanguageSwitcher />
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
  topSection: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  appName: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  form: {
    gap: spacing.xs,
  },
  formErrorBox: {
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
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
  loginBtn: {
    marginTop: spacing.sm,
  },
  bottom: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  noAccountText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
  langRow: {
    alignItems: "center",
  },
});
