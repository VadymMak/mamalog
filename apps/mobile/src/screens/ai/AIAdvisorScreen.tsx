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
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { get, set } from "../../lib/storage";
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";
import { commonStyles } from "../../theme/components";
import { useLanguageContext } from "../../context/LanguageContext";
import { useProGate } from "../../hooks/useProGate";

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

interface LogEntry {
  id: string;
  moodScore: number;
  emotions: string[];
  notes: string | null;
  date: string;
}

interface LogsApiResponse {
  success: boolean;
  data: LogEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 3;

const SUGGESTIONS = [
  "Какие паттерны вы видите?",
  "Что делать при истерике?",
  "Как улучшить сон ребёнка?",
  "Как справиться со стрессом маме?",
];

function todayKey(): string {
  return `@mamalog/ai_count_${new Date().toISOString().split("T")[0] ?? "unknown"}`;
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
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
    <View style={[styles.bubbleAI, styles.typingBubble]}>
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
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    Clipboard.setString(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
      <View style={isUser ? styles.bubbleUser : styles.bubbleAI}>
        {!isUser && (
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
        )}
        <Text style={isUser ? styles.bubbleUserText : styles.bubbleAIText}>
          {message.text}
        </Text>
        <View style={styles.messageMeta}>
          <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>
            {formatTime(message.timestamp)}
          </Text>
          {!isUser && (
            <TouchableOpacity
              onPress={handleCopy}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={13}
                color={copied ? colors.success : colors.textHint}
              />
            </TouchableOpacity>
          )}
          {__DEV__ && message.tokensUsed !== undefined && (
            <Text style={styles.tokensBadge}>{message.tokensUsed}t</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Limit banner ─────────────────────────────────────────────────────────────

function LimitBanner({ count }: { count: number }) {
  const remaining = Math.max(0, FREE_DAILY_LIMIT - count);
  const { requirePro } = useProGate();

  if (remaining === 0) {
    return (
      <View style={styles.limitBannerEmpty}>
        <Text style={styles.limitBannerText}>
          Дневной лимит исчерпан. Для неограниченного доступа оформите подписку.
        </Text>
        <TouchableOpacity onPress={() => requirePro(() => {})} activeOpacity={0.8}>
          <Text style={styles.limitBannerLink}>Открыть Mamalog Pro →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.limitBanner}>
      <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
      <Text style={styles.limitBannerCount}>
        Осталось {remaining} из {FREE_DAILY_LIMIT} бесплатных сообщений
      </Text>
    </View>
  );
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

interface SuggestionsProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

function SuggestionChips({ onSend, disabled }: SuggestionsProps) {
  return (
    <View style={styles.chipsRow}>
      {SUGGESTIONS.map((s) => (
        <TouchableOpacity
          key={s}
          style={[styles.chip, disabled && styles.chipDisabled]}
          onPress={() => !disabled && onSend(s)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, disabled && styles.chipTextDisabled]} numberOfLines={1}>
            {s}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onSend }: { onSend: (text: string) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.primaryLight} />
      </View>
      <Text style={styles.emptyTitle}>{t("ai.emptyTitle")}</Text>
      <SuggestionChips onSend={onSend} disabled={false} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AIAdvisorScreen() {
  const { t } = useTranslation();
  const { language } = useLanguageContext();
  const { isPro, requirePro } = useProGate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    get<number>(todayKey()).then((c) => setDailyCount(c ?? 0));
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  async function fetchRecentLogs(): Promise<string[]> {
    try {
      const res = await api.get<LogsApiResponse>("/api/log", { params: { limit: 3 } });
      return (res.data.data ?? []).map(
        (e) =>
          `[${new Date(e.date).toLocaleDateString("ru")}] Настроение: ${e.moodScore}/10` +
          (e.emotions.length ? `, эмоции: ${e.emotions.join(", ")}` : "") +
          (e.notes ? `, заметки: ${e.notes}` : "")
      );
    } catch {
      return [];
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    if (!isPro && dailyCount >= FREE_DAILY_LIMIT) {
      requirePro(() => {}); // opens Paywall
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

    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    await set(todayKey(), newCount);

    try {
      const recentLogs = await fetchRecentLogs();

      const res = await api.post<ApiChatResponse>("/api/ai/chat", {
        message: trimmed,
        language,
        context: { recentLogs },
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
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));

      // Check if server returned limitReached (429) — server-side daily limit hit
      const axiosErr = err as { response?: { status?: number; data?: { limitReached?: boolean } } };
      if (axiosErr?.response?.status === 429 && axiosErr?.response?.data?.limitReached) {
        setDailyCount(FREE_DAILY_LIMIT); // sync local counter to server reality
        await set(todayKey(), FREE_DAILY_LIMIT);
        Alert.alert(t("common.info"), t("ai.limitReached"));
      } else {
        setDailyCount((c) => Math.max(0, c - 1));
        await set(todayKey(), Math.max(0, newCount - 1));
        Alert.alert(t("common.error"), t("ai.errorSend"));
      }
    } finally {
      setIsThinking(false);
    }
  }

  const atLimit = dailyCount >= FREE_DAILY_LIMIT;
  const canSend = input.trim().length > 0 && !isThinking && !atLimit;

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("ai.title")}</Text>
        <Text style={styles.headerSubtitle}>{t("ai.subtitle")}</Text>
      </View>

      {/* Daily limit banner */}
      <LimitBanner count={dailyCount} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        {messages.length === 0 && !isThinking ? (
          <EmptyState onSend={sendMessage} />
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

        {/* Suggestion chips above input (when chat started) */}
        {messages.length > 0 && !atLimit && (
          <SuggestionChips onSend={sendMessage} disabled={isThinking} />
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, atLimit && styles.textInputDisabled]}
            value={input}
            onChangeText={setInput}
            placeholder={atLimit ? "Дневной лимит исчерпан" : t("ai.placeholder")}
            placeholderTextColor={colors.textHint}
            multiline
            maxLength={1000}
            numberOfLines={4}
            returnKeyType="default"
            editable={!atLimit}
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

  // Limit banner
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "#EDE9FE",
  },
  limitBannerCount: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  limitBannerEmpty: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#FFF5F5",
    borderBottomWidth: 1,
    borderBottomColor: "#FED7D7",
    gap: 2,
  },
  limitBannerText: { ...typography.caption, color: colors.error },
  limitBannerLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 2,
  },

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
  typingBubble: {
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  bubbleUserText: { ...typography.body, color: colors.white, lineHeight: 22 },
  bubbleAIText: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },

  // AI badge
  aiBadgeRow: { marginBottom: 4 },
  aiBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Message meta
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  messageTime: { ...typography.caption, color: colors.textHint },
  messageTimeUser: { color: "rgba(255,255,255,0.65)" },
  tokensBadge: { ...typography.caption, color: colors.textHint },

  // Typing dots
  dotsRow: { flexDirection: "row", gap: spacing.xs, paddingVertical: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },

  // Suggestion chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#EDE9FE",
  },
  chipDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  chipText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  chipTextDisabled: { color: colors.textHint },

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
  textInputDisabled: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.textHint,
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
