import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { STORAGE_KEYS } from "../../lib/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Slide definitions ────────────────────────────────────────────────────────

type SlideId = "welcome" | "diary" | "ai" | "community";

interface Slide {
  id: SlideId;
  accentColor: string;
}

const SLIDES: Slide[] = [
  { id: "welcome", accentColor: colors.sos },
  { id: "diary", accentColor: colors.primary },
  { id: "ai", accentColor: "#2B6CB0" },
  { id: "community", accentColor: colors.success },
];

// ─── Slide visuals ─────────────────────────────────────────────────────────────

function WelcomeVisual({ color }: { color: string }) {
  return (
    <View style={[styles.visualCircle, { backgroundColor: color }]}>
      <Ionicons name="heart" size={64} color={colors.white} />
    </View>
  );
}

function DiaryVisual({ color }: { color: string }) {
  const { t } = useTranslation();
  const pills = [
    { icon: "mic-outline" as const, label: t("onboarding.feature1") },
    { icon: "flash-outline" as const, label: t("onboarding.feature2") },
    { icon: "time-outline" as const, label: t("onboarding.feature3") },
  ];
  return (
    <View style={styles.pillsWrapper}>
      {pills.map((p) => (
        <View key={p.label} style={[styles.featurePill, { borderColor: color }]}>
          <Ionicons name={p.icon} size={20} color={color} />
          <Text style={[styles.featurePillText, { color }]}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

function AIVisual({ color }: { color: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.chatWrapper}>
      {/* Incoming bubble */}
      <View style={[styles.chatBubble, styles.chatBubbleIn, { backgroundColor: color }]}>
        <Text style={styles.chatBubbleTextIn}>{t("onboarding.aiMessage1")}</Text>
      </View>
      {/* Outgoing bubble */}
      <View style={[styles.chatBubble, styles.chatBubbleOut]}>
        <Text style={styles.chatBubbleTextOut}>{t("onboarding.aiMessage2")}</Text>
      </View>
      {/* Incoming reply */}
      <View style={[styles.chatBubble, styles.chatBubbleIn, { backgroundColor: color }]}>
        <Text style={styles.chatBubbleTextIn}>{t("onboarding.aiMessage3")}</Text>
      </View>
    </View>
  );
}

function CommunityVisual({ color }: { color: string }) {
  return (
    <View style={styles.avatarRow}>
      {["ЕМ", "ТС", "ОП", "АК"].map((initials, i) => (
        <View
          key={initials}
          style={[
            styles.communityAvatar,
            { backgroundColor: color, marginLeft: i === 0 ? 0 : -12 },
          ]}
        >
          <Text style={styles.communityInitials}>{initials}</Text>
        </View>
      ))}
      <View style={[styles.communityAvatar, styles.communityAvatarMore, { marginLeft: -12 }]}>
        <Text style={styles.communityMoreText}>+80</Text>
      </View>
    </View>
  );
}

// ─── Individual slide ─────────────────────────────────────────────────────────

function SlideView({ slide }: { slide: Slide }) {
  const { t } = useTranslation();

  const visuals: Record<SlideId, React.ReactElement> = {
    welcome: <WelcomeVisual color={slide.accentColor} />,
    diary: <DiaryVisual color={slide.accentColor} />,
    ai: <AIVisual color={slide.accentColor} />,
    community: <CommunityVisual color={slide.accentColor} />,
  };

  return (
    <View style={styles.slide}>
      <View style={styles.slideVisual}>{visuals[slide.id]}</View>
      <Text style={styles.slideTitle}>{t(`onboarding.${slide.id}Title`)}</Text>
      <Text style={styles.slideSubtitle}>{t(`onboarding.${slide.id}Subtitle`)}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const markDoneAndGo = useCallback(
    async (target: "Login" | "Register") => {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, "true");
      navigation.replace("Auth", { initialScreen: target });
    },
    [navigation]
  );

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      markDoneAndGo("Register");
    }
  }, [activeIndex, markDoneAndGo]);

  const handleSkip = useCallback(() => {
    markDoneAndGo("Login");
  }, [markDoneAndGo]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => <SlideView slide={item} />}
        style={styles.flatList}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.id}
            style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
              i === activeIndex && { backgroundColor: SLIDES[activeIndex].accentColor },
            ]}
          />
        ))}
      </View>

      {/* CTA button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: SLIDES[activeIndex].accentColor }]}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? t("onboarding.start") : t("onboarding.next")}
          </Text>
          {!isLast && (
            <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: spacing.xs }} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  slideVisual: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    minHeight: 180,
  },
  slideTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 30,
  },
  slideSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  // Welcome visual
  visualCircle: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
  // Diary visual — feature pills
  pillsWrapper: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  featurePillText: {
    ...typography.bodySmall,
    fontWeight: "600",
  },
  // AI visual — chat bubbles
  chatWrapper: {
    gap: spacing.sm,
    width: "90%",
  },
  chatBubble: {
    maxWidth: "80%",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    ...shadows.sm,
  },
  chatBubbleIn: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  chatBubbleOut: {
    alignSelf: "flex-end",
    backgroundColor: colors.surfaceSecondary,
    borderBottomRightRadius: 4,
  },
  chatBubbleTextIn: {
    ...typography.bodySmall,
    color: colors.white,
    lineHeight: 18,
  },
  chatBubbleTextOut: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  // Community visual — overlapping avatars
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  communityAvatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
    ...shadows.sm,
  },
  communityInitials: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
    fontSize: 11,
  },
  communityAvatarMore: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.background,
  },
  communityMoreText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 10,
  },
  // Dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
  },
  // Footer CTA
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  nextBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
