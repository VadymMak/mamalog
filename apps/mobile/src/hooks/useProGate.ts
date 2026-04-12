import { useNavigation } from "@react-navigation/native";
import { usePro } from "../context/ProContext";

export function useProGate() {
  const { isPro } = usePro();
  const navigation = useNavigation();

  /**
   * Runs `action` immediately if the user is PRO,
   * otherwise navigates to the Paywall screen.
   */
  const requirePro = (action: () => void) => {
    if (isPro) {
      action();
    } else {
      navigation.navigate("Paywall" as never);
    }
  };

  return { isPro, requirePro };
}
