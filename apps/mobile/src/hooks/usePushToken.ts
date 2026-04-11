import { useEffect } from "react";
import { registerForPushNotifications } from "../lib/notifications";
import { api } from "../lib/api";

// Registers device for push notifications and saves token to backend.
// Call this once after user is authenticated.
export function usePushToken(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications()
      .then((token) => {
        if (!token) return;
        api.post("/api/user/push-token", { token }).catch(() => {});
      })
      .catch(() => {});
  }, [isAuthenticated]);
}
