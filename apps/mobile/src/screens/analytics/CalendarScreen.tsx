import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors, spacing, borderRadius, typography, shadows } from "../../theme";
import { commonStyles } from "../../theme/components";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";

// Minimal nav type to avoid circular import with MainNavigator
type CalendarNav = NativeStackNavigationProp<{
  AddLesson: undefined;
  LessonNote: { lessonId: string };
}>;

interface Lesson {
  id: string;
  title: string;
  type: string;
  color: string;
  startTime: string;
  duration: number;
  location: string | null;
  specialist: string | null;
  date: string;
  note: string | null;
  rating: number | null;
  isRecurring: boolean;
}

interface LogEntrySlim {
  id: string;
  date: string;
  moodScore: number;
}

interface LessonsResponse {
  success: boolean;
  data: Lesson[];
}

interface LogResponse {
  success: boolean;
  data: LogEntrySlim[];
}

interface BehaviorEntry {
  id: string;
  category: string;
  createdAt: string;
  logEntry: { date: string };
}

interface BehaviorResponse {
  success: boolean;
  data: BehaviorEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = spacing.md;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2) / 7);

const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const MONTHS_GENITIVE_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Monday-first weekday: Mon=0 … Sun=6 */
function weekdayMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function buildMonthGrid(
  year: number,
  month: number
): Array<{ dateStr: string; isCurrentMonth: boolean }> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = weekdayMon(firstDay);

  const cells: Array<{ dateStr: string; isCurrentMonth: boolean }> = [];

  // Pad from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ dateStr: toISO(new Date(year, month, -i)), isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ dateStr: toISO(new Date(year, month, d)), isCurrentMonth: true });
  }

  // Pad to complete last row
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      cells.push({ dateStr: toISO(new Date(year, month + 1, i)), isCurrentMonth: false });
    }
  }

  return cells;
}

function buildWeekDays(dateStr: string): string[] {
  const d = parseLocalDate(dateStr);
  const mon = new Date(d);
  mon.setDate(d.getDate() - weekdayMon(d));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return toISO(day);
  });
}

function formatDayTitle(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const todaySuffix = dateStr === toISO(new Date()) ? " — сегодня" : "";
  return `${d.getDate()} ${MONTHS_GENITIVE_RU[d.getMonth()]}${todaySuffix}`;
}

// ─── CalendarScreen ───────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarNav>();

  const today = toISO(new Date());
  const todayDate = parseLocalDate(today);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntrySlim[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Derived maps ─────────────────────────────────────────────────────────

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const arr = map.get(l.date) ?? [];
      arr.push(l);
      map.set(l.date, arr);
    }
    return map;
  }, [lessons]);

  const moodByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of logEntries) {
      const dateStr = (e.date as string).split("T")[0] ?? e.date;
      map.set(dateStr, e.moodScore);
    }
    return map;
  }, [logEntries]);

  const behaviorDates = useMemo(() => {
    const set = new Set<string>();
    for (const b of behaviors) {
      // Use logEntry.date as the canonical day for the behavior
      const dateStr = b.logEntry.date.split("T")[0];
      if (dateStr) set.add(dateStr);
    }
    return set;
  }, [behaviors]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  // silent=true → header spinner only (used on focus re-fetch, avoids content flash)
  const fetchData = useCallback(async (year: number, month: number, silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    const startDate = toISO(new Date(year, month, 1));
    const endDate = toISO(new Date(year, month + 1, 0));

    try {
      const [lessonsRes, logRes, behaviorRes] = await Promise.allSettled([
        api.get<LessonsResponse>(`/api/lessons?startDate=${startDate}&endDate=${endDate}`),
        api.get<LogResponse>(`/api/log?from=${startDate}&to=${endDate}&limit=100`),
        api.get<BehaviorResponse>(`/api/behavior?startDate=${startDate}&endDate=${endDate}`),
      ]);

      if (lessonsRes.status === "fulfilled" && lessonsRes.value.data.success) {
        setLessons(lessonsRes.value.data.data);
      } else {
        setLessons([]);
      }
      if (logRes.status === "fulfilled" && logRes.value.data.success) {
        setLogEntries(logRes.value.data.data);
      } else {
        setLogEntries([]);
      }
      if (behaviorRes.status === "fulfilled" && behaviorRes.value.data.success) {
        setBehaviors(behaviorRes.value.data.data);
      } else {
        setBehaviors([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + month/year navigation
  useEffect(() => {
    fetchData(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchData]);

  // Re-fetch silently when user returns from AddLesson or LessonNote
  useFocusEffect(
    useCallback(() => {
      fetchData(viewYear, viewMonth, true);
    }, [fetchData, viewYear, viewMonth])
  );

  // ── Month navigation ──────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // ── Derived calendar data ─────────────────────────────────────────────────

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate]);
  const selectedLessons = lessonsByDate.get(selectedDate) ?? [];
  const selectedMood = moodByDate.get(selectedDate) ?? null;

  function goToAddLesson() {
    navigation.navigate("AddLesson");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={prevMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.monthTitleRow}>
          <Text style={styles.monthTitle}>
            {MONTHS_RU[viewMonth]} {viewYear}
          </Text>
          {refreshing && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.headerSpinner}
            />
          )}
        </View>
        <TouchableOpacity
          onPress={nextMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* View mode tabs */}
      <View style={styles.modeTabs}>
        {(["month", "week", "day"] as ViewMode[]).map((mode) => {
          const labels: Record<ViewMode, string> = {
            month: "Месяц",
            week: "Неделя",
            day: "День",
          };
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeTab, viewMode === mode && styles.modeTabActive]}
              onPress={() => setViewMode(mode)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modeTabText,
                  viewMode === mode && styles.modeTabTextActive,
                ]}
              >
                {labels[mode]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={commonStyles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {viewMode === "month" && (
            <MonthView
              grid={grid}
              today={today}
              selectedDate={selectedDate}
              lessonsByDate={lessonsByDate}
              moodByDate={moodByDate}
              behaviorDates={behaviorDates}
              onSelectDay={setSelectedDate}
            />
          )}

          {viewMode === "week" && (
            <WeekView
              weekDays={weekDays}
              today={today}
              selectedDate={selectedDate}
              lessonsByDate={lessonsByDate}
              onSelectDay={setSelectedDate}
            />
          )}

          {viewMode === "day" && (
            <DayListView lessons={selectedLessons} selectedDate={selectedDate} />
          )}

          {/* DayDetail panel — month & week view */}
          {viewMode !== "day" && (
            <DayDetailPanel
              selectedDate={selectedDate}
              lessons={selectedLessons}
              moodScore={selectedMood}
              viewYear={viewYear}
              viewMonth={viewMonth}
            />
          )}

          <View style={styles.scrollBottomPad} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={commonStyles.fab}
        onPress={goToAddLesson}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────

interface MonthViewProps {
  grid: Array<{ dateStr: string; isCurrentMonth: boolean }>;
  today: string;
  selectedDate: string;
  lessonsByDate: Map<string, Lesson[]>;
  moodByDate: Map<string, number>;
  behaviorDates: Set<string>;
  onSelectDay: (d: string) => void;
}

function MonthView({
  grid,
  today,
  selectedDate,
  lessonsByDate,
  moodByDate,
  behaviorDates,
  onSelectDay,
}: MonthViewProps) {
  return (
    <View style={monthStyles.wrapper}>
      {/* Weekday headers */}
      <View style={monthStyles.weekdayRow}>
        {WEEKDAYS_RU.map((wd) => (
          <View key={wd} style={monthStyles.weekdayCell}>
            <Text style={monthStyles.weekdayText}>{wd}</Text>
          </View>
        ))}
      </View>

      {/* Day cells */}
      <View style={monthStyles.grid}>
        {grid.map(({ dateStr, isCurrentMonth }) => {
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasLesson = (lessonsByDate.get(dateStr)?.length ?? 0) > 0;
          const mood = moodByDate.get(dateStr) ?? null;
          const moodGood = mood !== null && mood >= 7;
          const moodBad = mood !== null && mood <= 4;
          const hasBehavior = behaviorDates.has(dateStr);

          const dots: string[] = [];
          if (hasLesson) dots.push(colors.primary);
          if (moodGood) dots.push(colors.success);
          if (moodBad) dots.push(colors.warning);
          if (hasBehavior) dots.push(colors.error);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                monthStyles.cell,
                isSelected && !isToday && monthStyles.cellSelected,
              ]}
              onPress={() => onSelectDay(dateStr)}
              activeOpacity={0.65}
            >
              <View style={[monthStyles.dayCircle, isToday && monthStyles.dayCircleToday]}>
                <Text
                  style={[
                    monthStyles.dayText,
                    !isCurrentMonth && monthStyles.dayTextMuted,
                    isToday && monthStyles.dayTextToday,
                  ]}
                >
                  {parseInt(dateStr.split("-")[2] ?? "0", 10)}
                </Text>
              </View>
              <View style={monthStyles.dotsRow}>
                {dots.slice(0, 4).map((c, i) => (
                  <View key={i} style={[monthStyles.dot, { backgroundColor: c }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const monthStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: GRID_PADDING,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: "center",
  },
  weekdayText: {
    ...typography.caption,
    color: colors.textHint,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 12,
    alignItems: "center",
    paddingTop: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cellSelected: {
    backgroundColor: colors.surfaceSecondary,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleToday: {
    backgroundColor: colors.primary,
  },
  dayText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  dayTextMuted: {
    color: colors.textHint,
  },
  dayTextToday: {
    color: colors.white,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 3,
    height: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
});

// ─── WeekView ─────────────────────────────────────────────────────────────────

interface WeekViewProps {
  weekDays: string[];
  today: string;
  selectedDate: string;
  lessonsByDate: Map<string, Lesson[]>;
  onSelectDay: (d: string) => void;
}

function WeekView({
  weekDays,
  today,
  selectedDate,
  lessonsByDate,
  onSelectDay,
}: WeekViewProps) {
  return (
    <View style={weekStyles.wrapper}>
      {/* Day header row */}
      <View style={weekStyles.headerRow}>
        {weekDays.map((dateStr) => {
          const d = parseLocalDate(dateStr);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          return (
            <TouchableOpacity
              key={dateStr}
              style={[weekStyles.dayHeader, isSelected && weekStyles.dayHeaderSelected]}
              onPress={() => onSelectDay(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={weekStyles.dayHeaderWd}>
                {WEEKDAYS_RU[weekdayMon(d)]}
              </Text>
              <View style={[weekStyles.dayNum, isToday && weekStyles.dayNumToday]}>
                <Text style={[weekStyles.dayNumText, isToday && weekStyles.dayNumTextToday]}>
                  {d.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lesson cards per column */}
      <View style={weekStyles.cardsRow}>
        {weekDays.map((dateStr) => {
          const dayLessons = lessonsByDate.get(dateStr) ?? [];
          return (
            <View key={dateStr} style={weekStyles.column}>
              {dayLessons.length === 0 ? (
                <View style={weekStyles.emptyLine} />
              ) : (
                dayLessons.slice(0, 3).map((lesson) => (
                  <View
                    key={lesson.id}
                    style={[
                      weekStyles.lessonCard,
                      { borderLeftColor: lesson.color || colors.primary },
                    ]}
                  >
                    <Text style={weekStyles.lessonTime}>{lesson.startTime}</Text>
                    <Text style={weekStyles.lessonTitle} numberOfLines={2}>
                      {lesson.title}
                    </Text>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const weekStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: GRID_PADDING,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  dayHeader: {
    width: CELL_SIZE,
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  dayHeaderSelected: {
    backgroundColor: colors.surfaceSecondary,
  },
  dayHeaderWd: {
    ...typography.caption,
    color: colors.textHint,
    fontWeight: "600",
  },
  dayNum: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dayNumToday: {
    backgroundColor: colors.primary,
  },
  dayNumText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  dayNumTextToday: {
    color: colors.white,
    fontWeight: "700",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 2,
  },
  column: {
    width: CELL_SIZE,
    gap: 4,
  },
  emptyLine: {
    height: 2,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    padding: 4,
    ...shadows.sm,
  },
  lessonTime: {
    ...typography.caption,
    color: colors.textHint,
    fontSize: 10,
  },
  lessonTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "500",
    fontSize: 10,
    lineHeight: 13,
  },
});

// ─── DayListView ──────────────────────────────────────────────────────────────

interface DayListViewProps {
  lessons: Lesson[];
  selectedDate: string;
}

function DayListView({ lessons, selectedDate }: DayListViewProps) {
  const navigation = useNavigation<CalendarNav>();
  return (
    <View style={dayListStyles.wrapper}>
      <Text style={dayListStyles.dateTitle}>{formatDayTitle(selectedDate)}</Text>

      {lessons.length === 0 ? (
        <View style={dayListStyles.empty}>
          <Ionicons name="calendar-outline" size={40} color={colors.textHint} />
          <Text style={dayListStyles.emptyText}>
            Нет занятий. Нажмите + чтобы добавить
          </Text>
        </View>
      ) : (
        <View style={dayListStyles.list}>
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onPress={() => navigation.navigate("LessonNote", { lessonId: lesson.id })}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const dayListStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: GRID_PADDING,
  },
  dateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textHint,
    textAlign: "center",
  },
  list: {
    gap: spacing.sm,
  },
});

// ─── LessonCard (shared) ──────────────────────────────────────────────────────

function LessonCard({ lesson, onPress }: { lesson: Lesson; onPress?: () => void }) {
  const card = (
    <View style={lessonCardStyles.card}>
      <View
        style={[
          lessonCardStyles.colorDot,
          { backgroundColor: lesson.color || colors.primary },
        ]}
      />
      <View style={lessonCardStyles.content}>
        <Text style={lessonCardStyles.title}>{lesson.title}</Text>
        <Text style={lessonCardStyles.meta}>
          {lesson.startTime}
          {" · "}
          {lesson.duration} мин
          {lesson.specialist ? ` · ${lesson.specialist}` : ""}
        </Text>
        {lesson.note && (
          <Text style={lessonCardStyles.notePreview} numberOfLines={1}>
            {lesson.note.length > 50 ? lesson.note.slice(0, 50) + "…" : lesson.note}
          </Text>
        )}
      </View>
      {lesson.rating !== null && (
        <View style={[lessonCardStyles.ratingBadge, { backgroundColor: ratingBadgeColor(lesson.rating) }]}>
          <Ionicons name="star" size={10} color={colors.white} />
          <Text style={lessonCardStyles.ratingBadgeText}>{lesson.rating}</Text>
        </View>
      )}
      {lesson.isRecurring && (
        <Ionicons
          name="repeat"
          size={14}
          color={colors.textHint}
          style={{ marginLeft: spacing.xs }}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {card}
      </TouchableOpacity>
    );
  }
  return card;
}

function ratingBadgeColor(n: number): string {
  if (n <= 3) return colors.error;
  if (n <= 6) return colors.warning;
  return colors.success;
}

const lessonCardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notePreview: {
    ...typography.caption,
    color: colors.textHint,
    marginTop: 2,
    fontStyle: "italic",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    gap: 2,
    flexShrink: 0,
  },
  ratingBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
    fontSize: 11,
  },
});

// ─── DayDetailPanel ───────────────────────────────────────────────────────────

interface InsightItem {
  type: "positive" | "warning" | "neutral";
  icon: string;
  title: string;
  text: string;
  confidence: number;
}

interface AnalyzeResult {
  hasInsights: boolean;
  insights?: InsightItem[];
  recommendation?: string;
  message?: string;
}

interface DayDetailPanelProps {
  selectedDate: string;
  lessons: Lesson[];
  moodScore: number | null;
  viewYear: number;
  viewMonth: number; // 0-indexed
}

function insightBarColor(type: InsightItem["type"]): string {
  if (type === "positive") return colors.success;
  if (type === "warning") return colors.warning;
  return colors.textHint;
}

function DayDetailPanel({ selectedDate, lessons, moodScore, viewYear, viewMonth }: DayDetailPanelProps) {
  const navigation = useNavigation<CalendarNav>();

  const [aiResult, setAiResult] = useState<AnalyzeResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  // Reset AI state when month changes
  useEffect(() => {
    setAiResult(null);
    setAiLoaded(false);
    setAiLoading(false);
  }, [viewYear, viewMonth]);

  async function fetchAiInsights() {
    if (aiLoaded || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await api.post<AnalyzeResult>("/api/lessons/analyze", {
        month: viewMonth + 1,
        year: viewYear,
      });
      setAiResult(res.data);
      setAiLoaded(true);
    } catch {
      setAiResult({ hasInsights: false, message: "Не удалось загрузить анализ" });
      setAiLoaded(true);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <View style={detailStyles.panel}>
      {/* Date header */}
      <Text style={detailStyles.dateTitle}>{formatDayTitle(selectedDate)}</Text>

      {/* Lessons */}
      {lessons.length === 0 ? (
        <Text style={detailStyles.noLessons}>Занятия не запланированы</Text>
      ) : (
        <View style={detailStyles.lessonsList}>
          {lessons.map((lesson) => (
            <View key={lesson.id}>
              <LessonCard
                lesson={lesson}
                onPress={() => navigation.navigate("LessonNote", { lessonId: lesson.id })}
              />
              {!lesson.note && (
                <TouchableOpacity
                  style={detailStyles.addNoteBtn}
                  onPress={() => navigation.navigate("LessonNote", { lessonId: lesson.id })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={13} color={colors.primary} />
                  <Text style={detailStyles.addNoteBtnText}>Добавить заметку →</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Mood indicator */}
      {moodScore !== null && (
        <View style={detailStyles.moodRow}>
          <Ionicons name="happy-outline" size={16} color={colors.textSecondary} />
          <Text style={detailStyles.moodText}>
            Настроение: <Text style={detailStyles.moodScore}>{moodScore}/10</Text>
          </Text>
        </View>
      )}

      {/* ── AI analysis ── */}
      {!aiLoaded && (
        <TouchableOpacity
          style={detailStyles.aiBtn}
          onPress={fetchAiInsights}
          disabled={aiLoading}
          activeOpacity={0.7}
        >
          {aiLoading ? (
            <>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={detailStyles.aiBtnText}>Анализирую данные...</Text>
            </>
          ) : (
            <>
              <Text style={detailStyles.aiBtnIcon}>✨</Text>
              <Text style={detailStyles.aiBtnText}>AI-анализ месяца</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {aiLoaded && aiResult && !aiResult.hasInsights && (
        <Text style={detailStyles.aiEmpty}>{aiResult.message ?? "Недостаточно данных"}</Text>
      )}

      {aiLoaded && aiResult?.hasInsights && aiResult.insights && (
        <View style={detailStyles.insightsList}>
          {aiResult.insights.map((insight, i) => (
            <View key={i} style={detailStyles.insightCard}>
              <View style={detailStyles.insightHeader}>
                <Text style={detailStyles.insightIcon}>{insight.icon}</Text>
                <Text style={detailStyles.insightTitle}>{insight.title}</Text>
              </View>
              <Text style={detailStyles.insightText}>{insight.text}</Text>
              <View style={detailStyles.confidenceBar}>
                <View
                  style={[
                    detailStyles.confidenceFill,
                    {
                      width: `${insight.confidence}%` as `${number}%`,
                      backgroundColor: insightBarColor(insight.type),
                    },
                  ]}
                />
              </View>
            </View>
          ))}

          {aiResult.recommendation && (
            <View style={detailStyles.recommendation}>
              <Text style={detailStyles.recommendationLabel}>Рекомендация:</Text>
              <Text style={detailStyles.recommendationText}>{aiResult.recommendation}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const detailStyles = StyleSheet.create({
  panel: {
    marginTop: spacing.md,
    marginHorizontal: GRID_PADDING,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  dateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  noLessons: {
    ...typography.bodySmall,
    color: colors.textHint,
  },
  lessonsList: {
    gap: spacing.xs,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moodText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  moodScore: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  aiNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: "#EDE9FE",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  aiNoteText: {
    ...typography.caption,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 18,
  },
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: spacing.sm + 12 + spacing.sm, // align with card content
    paddingTop: 4,
    paddingBottom: 2,
  },
  addNoteBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },

  // AI analysis
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  aiBtnIcon: { fontSize: 16 },
  aiBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
  aiEmpty: {
    ...typography.caption,
    color: colors.textHint,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  insightsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  insightCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 4,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  insightIcon: { fontSize: 16 },
  insightTitle: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "700",
    flex: 1,
  },
  insightText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  confidenceBar: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  confidenceFill: {
    height: 3,
    borderRadius: 2,
  },
  recommendation: {
    backgroundColor: "#EDE9FE",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 4,
  },
  recommendationLabel: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: "700",
  },
  recommendationText: {
    ...typography.caption,
    color: colors.primaryDark,
    lineHeight: 18,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  monthTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  monthTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerSpinner: {
    marginLeft: 4,
  },
  modeTabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeTabText: {
    ...typography.buttonSmall,
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.white,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  scrollBottomPad: {
    height: 100,
  },
});
