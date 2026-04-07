import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../theme";

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>RegisterScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  label: {
    ...typography.h2,
    color: colors.textSecondary,
  },
});
