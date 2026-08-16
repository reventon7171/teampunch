import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChoiceModal } from "./ChoiceModal";
import { colors, fontSize, radius, spacing } from "../theme";

// "HH:MM" options every 15 minutes across the day — tap-to-pick instead of free typing so
// a shift can never be saved as "9:0" or "25:99" etc.
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  const value = `${h}:${m}`;
  return { label: value, value };
});

export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={styles.inputText}>{value || "เลือกเวลา"}</Text>
      </Pressable>
      <ChoiceModal
        visible={open}
        title={label}
        options={TIME_OPTIONS}
        selected={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.inkSoft, fontWeight: "600", marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  inputText: { fontSize: fontSize.base, color: colors.ink },
});
