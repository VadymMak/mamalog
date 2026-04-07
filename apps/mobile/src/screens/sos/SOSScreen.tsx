import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";

interface SOSAction {
  key: string;
  labelKey: "sos.whatToDo" | "sos.breathe" | "sos.audio";
  onPress: () => void;
}

export default function SOSScreen() {
  const { t } = useTranslation();

  const actions: SOSAction[] = [
    {
      key: "whatToDo",
      labelKey: "sos.whatToDo",
      onPress: () => {
        // TODO: navigate to "What to do now" guide
      },
    },
    {
      key: "breathe",
      labelKey: "sos.breathe",
      onPress: () => {
        // TODO: open breathing exercise
      },
    },
    {
      key: "audio",
      labelKey: "sos.audio",
      onPress: () => {
        // TODO: play calming audio for child
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#C53030" />
      <View style={styles.container}>
        <Text style={styles.title}>{t("sos.title")}</Text>

        <View style={styles.buttonsContainer}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.button}
              onPress={action.onPress}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>{t(action.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#C53030",
  },
  container: {
    flex: 1,
    backgroundColor: "#C53030",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 80,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 8,
    marginBottom: 48,
  },
  buttonsContainer: {
    width: "100%",
    gap: 16,
  },
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#C53030",
  },
});
