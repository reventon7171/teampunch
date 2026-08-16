import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <Pressable onPress={onDismiss} style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      {onDismiss && <Text style={styles.close}>✕</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: { color: "#7A2A21", fontSize: fontSize.base, flex: 1 },
  close: { color: "#7A2A21", fontWeight: "700", marginLeft: spacing.sm },
});
