import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme";
import { commonStyles } from "../../theme/components";

// ─── AddLessonScreen (placeholder) ───────────────────────────────────────────
// TODO: implement full lesson creation form

export default function AddLessonScreen() {
  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.container}>
        <Ionicons name="calendar-outline" size={56} color={colors.primary} />
        <Text style={styles.title}>Добавить занятие</Text>
        <Text style={styles.subtitle}>
          Форма создания занятия появится в следующей версии.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
