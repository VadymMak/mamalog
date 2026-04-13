import { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { usePro } from "../context/ProContext";
import { get } from "../lib/storage";

// Shared key with AIAdvisorScreen
const SUPERUSER_KEY = "@mamalog/ai_is_superuser";

export function useProGate() {
  const { isPro } = usePro();
  const navigation = useNavigation();
  const [isSuperUser, setIsSuperUser] = useState(false);

  useEffect(() => {
    get<boolean>(SUPERUSER_KEY).then((val) => {
      setIsSuperUser(val === true);
    });
  }, []);

  /**
   * Runs `action` immediately if the user is PRO or SuperUser,
   * otherwise navigates to the Paywall screen.
   */
  const requirePro = (action: () => void) => {
    if (isPro || isSuperUser) {
      action();
    } else {
      navigation.navigate("Paywall" as never);
    }
  };

  return { isPro, isSuperUser, requirePro };
}
