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
import { colors, spacing, borderRadius, shadows, typography } from "../../theme";

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
      <StatusBar barStyle="light-content" backgroundColor={colors.sos} />
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
    backgroundColor: colors.sos,
  },
  container: {
    flex: 1,
    backgroundColor: colors.sos,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 80,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 8,
    marginBottom: spacing.xxl,
  },
  buttonsContainer: {
    width: "100%",
    gap: spacing.md,
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadows.md,
  },
  buttonText: {
    ...typography.h3,
    color: colors.sos,
  },
});
