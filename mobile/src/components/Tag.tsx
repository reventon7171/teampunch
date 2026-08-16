import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

type Tone = "ontime" | "late" | "pending";

export function Tag({ label, tone }: { label: string; tone: Tone }) {
  const bg = tone === "ontime" ? colors.greenBg : tone === "late" ? colors.redBg : colors.amberBg;
  const fg = tone === "ontime" ? colors.green : tone === "late" ? colors.red : colors.amber;
  return (
    <Text style={[styles.tag, { backgroundColor: bg, color: fg }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
});
