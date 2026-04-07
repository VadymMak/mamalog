import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Animated,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type BreathPhase = "inhale" | "hold" | "exhale";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SOSScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Breathing animation
  const scale = useRef(new Animated.Value(1)).current;
  const isBreathingRef = useRef(false);
  const [breathingActive, setBreathingActive] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>("inhale");

  // "What to do now" expand
  const [stepsExpanded, setStepsExpanded] = useState(false);

  const runBreathCycle = useCallback(() => {
    if (!isBreathingRef.current) return;

    setPhase("inhale");
    Animated.timing(scale, {
      toValue: 1.45,
      duration: 4000,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isBreathingRef.current) return;
      setPhase("hold");
      Animated.timing(scale, {
        toValue: 1.45,
        duration: 4000,
        useNativeDriver: true,
      }).start(({ finished: f2 }) => {
        if (!f2 || !isBreathingRef.current) return;
        setPhase("exhale");
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 6000,
          useNativeDriver: true,
        }).start(({ finished: f3 }) => {
          if (f3 && isBreathingRef.current) runBreathCycle();
        });
      });
    });
  }, [scale]);

  const startBreathing = useCallback(() => {
    isBreathingRef.current = true;
    setBreathingActive(true);
    scale.setValue(1);
    runBreathCycle();
  }, [scale, runBreathCycle]);

  const stopBreathing = useCallback(() => {
    isBreathingRef.current = false;
    setBreathingActive(false);
    scale.stopAnimation();
    Animated.timing(scale, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handleCall = useCallback(() => {
    Linking.openURL("tel:88002000122");
  }, []);

  const handleChat = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const phaseTextKey: Record<BreathPhase, string> = {
    inhale: t("sos.phaseInhale"),
    hold: t("sos.phaseHold"),
    exhale: t("sos.phaseExhale"),
  };

  const TIPS: string[] = [
    t("sos.tip1"),
    t("sos.tip2"),
    t("sos.tip3"),
    t("sos.tip4"),
    t("sos.tip5"),
  ];

  const STEPS: string[] = [
    t("sos.step1"),
    t("sos.step2"),
    t("sos.step3"),
    t("sos.step4"),
    t("sos.step5"),
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.sos} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.sosTitle}>{t("sos.title")}</Text>
        <Text style={styles.sosSubtitle}>{t("sos.subtitle")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Breathing widget ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("sos.breatheTitle")}</Text>
          <View style={styles.breatheWrapper}>
            {/* Outer ring */}
            <View style={styles.breatheOuter}>
              <Animated.View
                style={[
                  styles.breatheCircle,
                  { transform: [{ scale }] },
                ]}
              >
                <Text style={styles.breathePhaseText}>
                  {breathingActive ? phaseTextKey[phase] : t("sos.breatheStart")}
                </Text>
              </Animated.View>
            </View>
            <TouchableOpacity
              style={styles.breatheBtn}
              onPress={breathingActive ? stopBreathing : startBreathing}
              activeOpacity={0.85}
            >
              <Text style={styles.breatheBtnText}>
                {breathingActive ? t("sos.stop") : t("sos.start")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick action cards (2×2) ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("sos.actionsTitle")}</Text>
          <View style={styles.grid}>
            {/* What to do now */}
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardRed]}
              onPress={() => setStepsExpanded((v) => !v)}
              activeOpacity={0.88}
            >
              <Ionicons name="list-outline" size={24} color={colors.white} />
              <Text style={styles.actionCardText}>{t("sos.whatToDo")}</Text>
              <Ionicons
                name={stepsExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>

            {/* Audio for child */}
            <View style={[styles.actionCard, styles.actionCardPurple, styles.actionCardDisabled]}>
              <Ionicons name="musical-notes-outline" size={24} color={colors.white} />
              <Text style={styles.actionCardText}>{t("sos.audio")}</Text>
              <Text style={styles.comingSoon}>{t("sos.comingSoon")}</Text>
            </View>

            {/* Call specialist */}
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardGreen]}
              onPress={handleCall}
              activeOpacity={0.88}
            >
              <Ionicons name="call-outline" size={24} color={colors.white} />
              <Text style={styles.actionCardText}>{t("sos.callTitle")}</Text>
              <Text style={styles.actionCardHint}>8-800-200-01-22</Text>
            </TouchableOpacity>

            {/* Write to AI chat */}
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardBlue]}
              onPress={handleChat}
              activeOpacity={0.88}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.white} />
              <Text style={styles.actionCardText}>{t("sos.chatTitle")}</Text>
            </TouchableOpacity>
          </View>

          {/* Expandable steps */}
          {stepsExpanded && (
            <View style={styles.stepsContainer}>
              {STEPS.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Calm tips ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("sos.tipsTitle")}</Text>
          <View style={styles.tipsList}>
            {TIPS.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.sosLight} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Bottom note ───────────────────────────────────────── */}
        <View style={styles.freeNote}>
          <Ionicons name="heart" size={14} color={colors.sosLight} />
          <Text style={styles.freeNoteText}>{t("sos.freeNote")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 140;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.sos,
  },
  header: {
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  sosTitle: {
    fontSize: 72,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 8,
    lineHeight: 80,
  },
  sosSubtitle: {
    ...typography.body,
    color: "rgba(255,255,255,0.8)",
    marginTop: spacing.xs,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.white,
  },
  // Breathe widget
  breatheWrapper: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  breatheOuter: {
    width: CIRCLE_SIZE + 40,
    height: CIRCLE_SIZE + 40,
    borderRadius: (CIRCLE_SIZE + 40) / 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  breatheCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  breathePhaseText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  breatheBtn: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  breatheBtnText: {
    ...typography.button,
    color: colors.sos,
  },
  // Action grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionCard: {
    width: "47.5%",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 100,
    justifyContent: "center",
    alignItems: "flex-start",
    ...shadows.sm,
  },
  actionCardRed: {
    backgroundColor: "rgba(197,48,48,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionCardPurple: {
    backgroundColor: "rgba(107,70,193,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionCardGreen: {
    backgroundColor: "rgba(56,161,105,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionCardBlue: {
    backgroundColor: "rgba(43,108,176,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionCardDisabled: {
    opacity: 0.75,
  },
  actionCardText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: "600",
    lineHeight: 18,
  },
  actionCardHint: {
    ...typography.caption,
    color: "rgba(255,255,255,0.8)",
  },
  comingSoon: {
    ...typography.caption,
    color: "rgba(255,255,255,0.65)",
    fontStyle: "italic",
  },
  // Expanded steps
  stepsContainer: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    ...typography.caption,
    color: colors.sos,
    fontWeight: "700",
  },
  stepText: {
    ...typography.bodySmall,
    color: colors.white,
    flex: 1,
    lineHeight: 20,
  },
  // Tips
  tipsList: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.white,
    flex: 1,
    lineHeight: 20,
  },
  // Bottom note
  freeNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  freeNoteText: {
    ...typography.caption,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
});
