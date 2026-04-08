import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { get, set, remove } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/constants";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (user: AuthUser, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      const saved = await get<AuthUser>(STORAGE_KEYS.USER);
      setUser(saved);
      setIsLoading(false);
    }
    restore();
  }, []);

  async function signIn(user: AuthUser, token: string) {
    // Set user first so isAuthenticated flips immediately and
    // AppNavigator can react before AsyncStorage writes complete
    setUser(user);
    await set(STORAGE_KEYS.USER, user);
    await set(STORAGE_KEYS.AUTH_TOKEN, token);
    await set(STORAGE_KEYS.USER_ID, user.id);
  }

  async function signOut() {
    await remove(STORAGE_KEYS.USER);
    await remove(STORAGE_KEYS.AUTH_TOKEN);
    await remove(STORAGE_KEYS.USER_ID);
    // STORAGE_KEYS.ONBOARDING_COMPLETE is intentionally kept
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
