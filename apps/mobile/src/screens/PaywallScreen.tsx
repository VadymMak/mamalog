import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "../services/purchases";
import { usePro } from "../context/ProContext";
import { colors, spacing, borderRadius, typography, shadows } from "../theme";
import { commonStyles } from "../theme/components";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  { icon: "✨", text: "AI-советник без ограничений" },
  { icon: "📊", text: "AI-анализ паттернов поведения" },
  { icon: "📅", text: "Расширенная аналитика занятий" },
  { icon: "🔔", text: "Напоминания о занятиях" },
  { icon: "📚", text: "Вся библиотека специалистов" },
];

// ─── PaywallScreen ────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { refresh } = usePro();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ── Load offerings ──────────────────────────────────────────────────────

  useEffect(() => {
    getOfferings().then((offering) => {
      if (offering?.availablePackages.length) {
        setPackages(offering.availablePackages);
        // Pre-select the annual package if available, else first
        const annual = offering.availablePackages.find((p) =>
          p.identifier.toLowerCase().includes("annual")
        );
        setSelected(annual ?? offering.availablePackages[0] ?? null);
      }
      setLoadingOfferings(false);
    });
  }, []);

  // ── Purchase ────────────────────────────────────────────────────────────

  async function handlePurchase() {
    if (!selected) return;
    setPurchasing(true);
    try {
      const isPro = await purchasePackage(selected);
      if (isPro) {
        await refresh();
        navigation.goBack();
      } else {
        Alert.alert("Ошибка", "Не удалось активировать подписку.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Покупка отменена.";
      Alert.alert("Покупка отменена", msg);
    } finally {
      setPurchasing(false);
    }
  }

  // ── Restore ─────────────────────────────────────────────────────────────

  async function handleRestore() {
    setRestoring(true);
    try {
      const isPro = await restorePurchases();
      if (isPro) {
        await refresh();
        Alert.alert("Успешно", "Подписка восстановлена!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Покупки не найдены", "Активная подписка не обнаружена.");
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось восстановить покупки.");
    } finally {
      setRestoring(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function packageLabel(pkg: PurchasesPackage): { title: string; price: string; badge?: string } {
    const id = pkg.identifier.toLowerCase();
    const priceStr = pkg.product.priceString;

    if (id.includes("annual") || id.includes("yearly")) {
      return { title: "Годовой план", price: `${priceStr}/год`, badge: "Скидка 30%" };
    }
    return { title: "Месячный план", price: `${priceStr}/мес` };
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.headerTitle}>Mamalog Pro</Text>
          <Text style={styles.headerSubtitle}>
            Максимум поддержки для вашего ребёнка
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Что входит в PRO:</Text>
          {PRO_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </View>
          ))}
        </View>

        {/* Pricing */}
        <Text style={styles.sectionLabel}>Выберите план:</Text>

        {loadingOfferings ? (
          <View style={styles.offeringsLoader}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.offeringsLoaderText}>Загружаем предложения...</Text>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.offeringsLoader}>
            <Text style={styles.offeringsLoaderText}>
              Предложения недоступны. Проверьте подключение.
            </Text>
          </View>
        ) : (
          <View style={styles.packagesRow}>
            {packages.map((pkg) => {
              const { title, price, badge } = packageLabel(pkg);
              const isSelected = selected?.identifier === pkg.identifier;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => setSelected(pkg)}
                  activeOpacity={0.8}
                >
                  {badge && (
                    <View style={styles.packageBadge}>
                      <Text style={styles.packageBadgeText}>{badge}</Text>
                    </View>
                  )}
                  <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>
                    {title}
                  </Text>
                  <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                    {price}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.white}
                      style={styles.packageCheck}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Trial note */}
        <Text style={styles.trialNote}>
          7 дней бесплатно, затем автоматическое списание. Отменить можно в любой момент.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={[
            commonStyles.buttonPrimary,
            styles.ctaBtn,
            (!selected || purchasing) && styles.ctaBtnDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selected || purchasing}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={commonStyles.buttonPrimaryText}>
              Начать бесплатный период 7 дней
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.restoreText}>Восстановить покупки</Text>
          )}
        </TouchableOpacity>

        {/* Continue free */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Продолжить бесплатно →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header (purple)
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  headerContent: {
    alignItems: "center",
    gap: spacing.xs,
  },
  crown: { fontSize: 44 },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    textAlign: "center",
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 4,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // Features card
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  featuresTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureIcon: { fontSize: 20 },
  featureText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },

  // Section label
  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Offerings loader
  offeringsLoader: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  offeringsLoaderText: {
    ...typography.bodySmall,
    color: colors.textHint,
    textAlign: "center",
  },

  // Package cards
  packagesRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  packageCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadows.sm,
  },
  packageCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  packageBadge: {
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  packageBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
  },
  packageTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  packageTitleSelected: { color: "rgba(255,255,255,0.9)" },
  packagePrice: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: "center",
  },
  packagePriceSelected: { color: colors.white },
  packageCheck: { marginTop: 4 },

  // Trial note
  trialNote: {
    ...typography.caption,
    color: colors.textHint,
    textAlign: "center",
    lineHeight: 18,
  },

  // CTA
  ctaBtn: { marginTop: spacing.xs },
  ctaBtnDisabled: { opacity: 0.6 },

  // Restore
  restoreBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  restoreText: {
    ...typography.bodySmall,
    color: colors.primary,
    textDecorationLine: "underline",
  },

  // Skip
  skipBtn: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textHint,
  },
});
