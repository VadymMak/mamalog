import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkProStatus, initPurchases } from "../services/purchases";
import { useAuthContext } from "./AuthContext";

const SUPERUSER_KEY = "@mamalog/ai_is_superuser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProContextType {
  isPro: boolean;
  isSuperUser: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProContext = createContext<ProContextType>({
  isPro: false,
  isSuperUser: false,
  loading: true,
  refresh: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [isPro, setIsPro] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const pro = await checkProStatus();
      setIsPro(pro);

      const su = await AsyncStorage.getItem(SUPERUSER_KEY);
      setIsSuperUser(su === "true");
    } catch {
      setIsPro(false);
      setIsSuperUser(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      initPurchases(user.id);
      void refresh();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <ProContext.Provider value={{ isPro, isSuperUser, loading, refresh }}>
      {children}
    </ProContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePro(): ProContextType {
  return useContext(ProContext);
}
