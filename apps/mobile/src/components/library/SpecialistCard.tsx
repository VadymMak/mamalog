import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius, typography } from "../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Specialist {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  color: string;
  initials: string;
}

interface SpecialistCardProps {
  specialist: Specialist;
  onPress: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpecialistCard({ specialist, onPress }: SpecialistCardProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(specialist.id)}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: specialist.color }]}>
        <Text style={styles.initials}>{specialist.initials}</Text>
      </View>

      {/* Info */}
      <Text style={styles.name} numberOfLines={2}>
        {specialist.name}
      </Text>
      <Text style={styles.specialty} numberOfLines={1}>
        {specialist.specialty}
      </Text>

      {/* Rating row */}
      <View style={styles.row}>
        <Ionicons name="star" size={12} color={colors.warning} />
        <Text style={styles.rating}>{specialist.rating.toFixed(1)}</Text>
      </View>

      {/* Experience */}
      <Text style={styles.experience}>
        {specialist.experience} {t("library.yearsExp")}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  initials: {
    ...typography.h3,
    color: colors.white,
  },
  name: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  specialty: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  rating: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  experience: {
    ...typography.caption,
    color: colors.textHint,
    textAlign: "center",
  },
});
