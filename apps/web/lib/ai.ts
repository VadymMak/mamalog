interface BehaviorLogSummary {
  category: string;
  intensity: number | null;
  trigger: string | null;
}

interface LogEntryWithBehaviors {
  date: Date;
  moodScore: number;
  emotions: string[];
  triggers: string[];
  energyLevel: number | null;
  sleepHours: number | null;
  notes: string | null;
  behaviors: BehaviorLogSummary[];
}

/** Full diary formatter — kept for potential future use */
export function formatLogsForAI(logs: LogEntryWithBehaviors[]): string {
  if (logs.length === 0) return "No diary entries in the last 7 days.";

  return logs
    .map((log) => {
      const date = log.date.toISOString().split("T")[0];
      const lines: string[] = [`Date: ${date}`, `Mood: ${log.moodScore}/10`];

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

/**
 * Build the system prompt for AI advisor.
 * knowledgeContext is pre-built by buildKnowledgeContext() in embeddings.ts
 * and already includes both RAG chunks and recent diary entries.
 */
export function buildSystemPrompt(
  language: string,
  knowledgeContext?: string
): string {
  return `You are a caring AI advisor for mothers of children with special needs (ASD, ADHD, developmental delays).
Language: ${language === "ru" ? "Russian" : "English"}
Always respond with empathy and practical advice.
${knowledgeContext ? `\n${knowledgeContext}` : ""}
When using knowledge from the database, cite the source.
Never give medical diagnoses. Always recommend consulting specialists.`;
}
