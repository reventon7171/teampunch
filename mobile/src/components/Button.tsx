import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, fontSize } from "../theme";

type Variant = "green" | "red" | "navy" | "ghost";

export function Button({
  title,
  onPress,
  variant = "navy",
  disabled,
  loading,
  fullWidth,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const bg =
    variant === "green" ? colors.green : variant === "red" ? colors.red : variant === "navy" ? colors.navy : "transparent";
  const textColor = variant === "ghost" ? colors.ink : colors.white;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        variant === "ghost" && styles.ghostBorder,
        fullWidth && { alignSelf: "stretch" },
        isDisabled && { opacity: 0.45 },
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBorder: { borderWidth: 1, borderColor: colors.line },
  text: { fontSize: fontSize.base, fontWeight: "700" },
});
