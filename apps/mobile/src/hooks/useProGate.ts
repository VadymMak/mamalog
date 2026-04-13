import { useNavigation } from "@react-navigation/native";
import { usePro } from "../context/ProContext";

export function useProGate() {
  const { isPro, isSuperUser } = usePro();
  const navigation = useNavigation();

  /**
   * Runs `action` immediately if the user is PRO or SuperUser,
   * otherwise navigates to the Paywall screen.
   * isSuperUser is loaded synchronously from ProContext — no race condition.
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
