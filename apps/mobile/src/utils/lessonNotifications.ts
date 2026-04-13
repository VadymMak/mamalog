import * as Notifications from "expo-notifications";
import * as Localization from "expo-localization";

// ─── Pending notification store ───────────────────────────────────────────────
// Module-level variable so AppNavigator can store a tapped notification and
// AnalyticsScreen can consume it when it comes into focus.

let _pendingLessonId: string | null = null;

export function setPendingLessonNotification(lessonId: string): void {
  _pendingLessonId = lessonId;
}

export function consumePendingLessonNotification(): string | null {
  const id = _pendingLessonId;
  _pendingLessonId = null;
  return id;
}

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Schedule reminders ───────────────────────────────────────────────────────

export async function scheduleLessonReminder(lesson: {
  id: string;
  title: string;
  date: string;      // "2026-04-11"
  startTime: string; // "10:00"
}): Promise<{ beforeId: string; afterId: string } | null> {
  const [year, month, day] = lesson.date.split("-").map(Number);
  const [hour, minute] = lesson.startTime.split(":").map(Number);

  // new Date(y, m, d, h, min) always uses LOCAL timezone — correct behaviour
  const lessonDate = new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);

  if (__DEV__) {
    console.log("[notifications] Lesson local time:", lessonDate.toLocaleString());
    console.log("[notifications] Device timezone:", Localization.getCalendars()[0]?.timeZone ?? "unknown");
    console.log("[notifications] UTC offset (min):", new Date().getTimezoneOffset());
  }

  const reminderDate = new Date(lessonDate.getTime() - 30 * 60 * 1000);

  if (reminderDate <= new Date()) {
    console.log("[notifications] Reminder in past, skipping");
    return null; // skip past reminders
  }

  const beforeId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Скоро занятие",
      body: `Через 30 минут: ${lesson.title}`,
      data: { lessonId: lesson.id, type: "before" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  // "How did it go?" — 1 hour after lesson starts
  const afterDate = new Date(lessonDate.getTime() + 60 * 60 * 1000);
  const afterId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Как прошло занятие?",
      body: `Оцените как прошло: ${lesson.title}`,
      data: { lessonId: lesson.id, type: "after" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: afterDate,
    },
  });

  return { beforeId, afterId };
}

// ─── Cancel reminders ─────────────────────────────────────────────────────────

export async function cancelLessonReminders(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}
