import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { get, set } from "../../lib/storage";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import { useLanguageContext } from "../../context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
  language: string;
  tokensUsed?: number;
}

interface ApiChatResponse {
  success: boolean;
  data: {
    reply: string;
    language: string;
    tokensUsed: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 3;
const __DEV__ = process.env.NODE_ENV === "development";

function todayKey(): string {
  const today = new Date().toISOString().split("T")[0] ?? "unknown";
  return `@mamalog/ai_count_${today}`;
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.bubbleAI}>
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const time = message.timestamp.toLocaleTimeString("ru", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
      <View style={[isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={isUser ? styles.bubbleUserText : styles.bubbleAIText}>
          {message.text}
        </Text>
        <View style={styles.messageMeta}>
          <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>{time}</Text>
          <View style={[styles.langBadge, isUser && styles.langBadgeUser]}>
            <Text style={[styles.langBadgeText, isUser && styles.langBadgeTextUser]}>
              {message.language.toUpperCase()}
            </Text>
          </View>
          {__DEV__ && message.tokensUsed !== undefined && (
            <Text style={styles.tokensBadge}>{message.tokensUsed}t</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
}

function EmptyState({ onSuggestion }: EmptyStateProps) {
  const { t } = useTranslation();
  const suggestions = [
    t("ai.suggestion1"),
    t("ai.suggestion2"),
    t("ai.suggestion3"),
  ];

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.primaryLight} />
      </View>
      <Text style={styles.emptyTitle}>{t("ai.emptyTitle")}</Text>
      <View style={styles.suggestionsRow}>
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s}
            style={styles.suggestionChip}
            onPress={() => onSuggestion(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AIAdvisorScreen() {
  const { t } = useTranslation();
  const { language } = useLanguageContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  async function checkDailyLimit(): Promise<boolean> {
    const count = (await get<number>(todayKey())) ?? 0;
    return count < FREE_DAILY_LIMIT;
  }

  async function incrementDailyCount() {
    const count = (await get<number>(todayKey())) ?? 0;
    await set(todayKey(), count + 1);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const allowed = await checkDailyLimit();
    if (!allowed) {
      Alert.alert(t("ai.limitTitle"), t("ai.limitMessage"), [
        { text: t("ai.limitCancel"), style: "cancel" },
        { text: t("ai.limitUpgrade"), onPress: () => { /* TODO: paywall */ } },
      ]);
      return;
    }

    const userMsg: Message = {
      id: makeId(),
      role: "user",
      text: trimmed,
      timestamp: new Date(),
      language,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      await incrementDailyCount();
      const res = await api.post<ApiChatResponse>("/api/ai/chat", {
        message: trimmed,
        language,
      });

      const aiMsg: Message = {
        id: makeId(),
        role: "ai",
        text: res.data.data.reply,
        timestamp: new Date(),
        language: res.data.data.language,
        tokensUsed: res.data.data.tokensUsed,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      Alert.alert(t("common.error"), t("ai.errorSend"));
      // Remove user message on failure so they can retry
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsThinking(false);
    }
  }

  const canSend = input.trim().length > 0 && !isThinking;

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("ai.title")}</Text>
        <Text style={styles.headerSubtitle}>{t("ai.subtitle")}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        {messages.length === 0 && !isThinking ? (
          <EmptyState onSuggestion={(s) => { setInput(s); }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isThinking ? <TypingDots /> : null}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={t("ai.placeholder")}
            placeholderTextColor={colors.textHint}
            multiline
            maxLength={1000}
            numberOfLines={4}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            {isThinking ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  // Messages list
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  messageRow: { flexDirection: "row", marginBottom: spacing.xs },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAI: { justifyContent: "flex-start" },

  // Bubbles
  bubbleUser: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "80%",
    ...shadows.sm,
  },
  bubbleAI: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "80%",
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUserText: { ...typography.body, color: colors.white, lineHeight: 22 },
  bubbleAIText: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },

  // Message meta
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  messageTime: { ...typography.caption, color: colors.textHint },
  messageTimeUser: { color: "rgba(255,255,255,0.65)" },
  langBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  langBadgeUser: { backgroundColor: "rgba(255,255,255,0.2)" },
  langBadgeText: { ...typography.caption, color: colors.textSecondary, fontWeight: "600" },
  langBadgeTextUser: { color: colors.white },
  tokensBadge: { ...typography.caption, color: colors.textHint },

  // Typing dots
  dotsRow: { flexDirection: "row", gap: spacing.xs, paddingVertical: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIllustration: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#EDE9FE",
  },
  suggestionText: { ...typography.bodySmall, color: colors.primary, fontWeight: "600" },

  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
