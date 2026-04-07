import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";

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

interface ApiResponse {
  success: boolean;
  data: ProfileUser;
  error?: string;
}

interface UseProfileResult {
  user: ProfileUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfile(): UseProfileResult {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse>("/api/user");
      if (res.data.success) {
        setUser(res.data.data);
      } else {
        setError(res.data.error ?? "Failed to load profile");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  return { user, loading, error, refetch: fetchProfile };
}
