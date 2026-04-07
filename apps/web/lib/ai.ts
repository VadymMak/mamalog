import type { LogEntry, BehaviorLog } from "@prisma/client";

type LogEntryWithBehaviors = LogEntry & { behaviors: BehaviorLog[] };

export function formatLogsForAI(logs: LogEntryWithBehaviors[]): string {
  if (logs.length === 0) return "No diary entries in the last 7 days.";

  return logs
    .map((log) => {
      const date = log.date.toISOString().split("T")[0];
      const lines: string[] = [
        `Date: ${date}`,
        `Mood: ${log.moodScore}/10`,
      ];

      if (log.emotions.length > 0) lines.push(`Emotions: ${log.emotions.join(", ")}`);
      if (log.triggers.length > 0) lines.push(`Triggers: ${log.triggers.join(", ")}`);
      if (log.energyLevel !== null) lines.push(`Energy: ${log.energyLevel}/10`);
      if (log.sleepHours !== null) lines.push(`Sleep: ${log.sleepHours}h`);
      if (log.notes) lines.push(`Notes: ${log.notes}`);

      if (log.behaviors.length > 0) {
        const behaviorSummary = log.behaviors
          .map((b) => {
            const parts = [b.category];
            if (b.intensity !== null) parts.push(`intensity ${b.intensity}/10`);
            if (b.trigger) parts.push(`trigger: ${b.trigger}`);
            return parts.join(", ");
          })
          .join(" | ");
        lines.push(`Behaviors: ${behaviorSummary}`);
      }

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}

export function buildSystemPrompt(
  language: string,
  logsContext: string
): string {
  return `You are a compassionate AI assistant for Mamalog — an app that helps mothers of children with special needs (ASD, ADHD, developmental delays) keep observation diaries.

CRITICAL RULE: Always respond in the same language as the user's message. If message is in Russian — respond in Russian. If in English — respond in English. Never mix languages in one response.

Your role:
- Analyze diary entries and identify behavioral patterns
- Give practical, evidence-based advice
- Be warm, empathetic, non-judgmental
- Never diagnose — always recommend consulting specialists
- Keep responses concise (max 3-4 paragraphs)

User's language preference: ${language}

User's recent diary data (last 7 days):
${logsContext}`;
}
