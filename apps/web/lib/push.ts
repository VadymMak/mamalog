// Expo Push Notification helper — no SDK needed, plain fetch to Expo API

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100; // Expo limit per request

export async function sendExpoPush(
  tokens: string[],
  message: PushMessage
): Promise<void> {
  const validTokens = tokens.filter(
    (t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[")
  );
  if (validTokens.length === 0) return;

  // Split into chunks of 100
  for (let i = 0; i < validTokens.length; i += CHUNK_SIZE) {
    const chunk = validTokens.slice(i, i + CHUNK_SIZE);
    const body = chunk.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: "default",
    }));

    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("[sendExpoPush] chunk failed:", err);
    }
  }
}
