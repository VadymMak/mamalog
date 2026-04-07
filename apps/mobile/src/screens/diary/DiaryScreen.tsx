import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DiaryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>DiaryScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  label: { fontSize: 20, color: "#333" },
});
