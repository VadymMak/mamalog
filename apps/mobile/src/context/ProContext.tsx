import React, { createContext, useContext, useEffect, useState } from "react";
import { checkProStatus, initPurchases } from "../services/purchases";
import { useAuthContext } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProContextType {
  isPro: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProContext = createContext<ProContextType>({
  isPro: false,
  loading: true,
  refresh: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const pro = await checkProStatus();
      setIsPro(pro);
    } catch {
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      try {
        initPurchases(user.id); // safe — wrapped in try-catch inside
      } catch (e) {
        console.warn("[ProContext] initPurchases threw:", e);
      }
      void refresh();
    } else {
      // Not logged in — still mark loading done
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <ProContext.Provider value={{ isPro, loading, refresh }}>
      {children}
    </ProContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePro(): ProContextType {
  return useContext(ProContext);
}
