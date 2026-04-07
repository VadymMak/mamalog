import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthContext } from "../context/AuthContext";
import { API_URL } from "../lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  childName: string | null;
  childAge: number | null;
  diagnosis: string | null;
  language: string;
  subscription: {
    plan: "FREE" | "MONTHLY" | "YEARLY";
    status: string;
    expiresAt: string | null;
  } | null;
  stats: {
    diaryDays: number;
    totalEntries: number;
    episodes: number;
  };
}

interface UseProfileResult {
  user: ProfileUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfile(): UseProfileResult {
  const { user: authUser } = useAuthContext();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/user`, {
        headers: { Authorization: `Bearer ${authUser.id}` },
      });
      const json = await res.json();
      if (json.success) {
        setUser(json.data as ProfileUser);
      } else {
        setError(json.error ?? "Failed to load profile");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  return { user, loading, error, refetch: fetchProfile };
}
