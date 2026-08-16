import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChoiceModal } from "./ChoiceModal";
import { colors, fontSize, radius, spacing } from "../theme";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const pad2 = (n: number) => String(n).padStart(2, "0");

type OpenField = "d" | "m" | "y" | null;

// Day/month/year tap-to-pick — value is always a valid "YYYY-MM-DD" the moment any part
// changes (day clamps to the new month's length), so a typo like "2026-02-30" is impossible.
export function DateField({
  label,
  value,
  onChange,
  yearRange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  yearRange?: [number, number];
}) {
  const [open, setOpen] = useState<OpenField>(null);
  const today = new Date();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const [y, m, d] = valid ? value.split("-").map(Number) : [today.getFullYear(), today.getMonth() + 1, today.getDate()];

  const minYear = yearRange?.[0] ?? today.getFullYear() - 15;
  const maxYear = yearRange?.[1] ?? today.getFullYear() + 2;
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((yy) => ({
    label: String(yy),
    value: String(yy),
  }));
  const monthOptions = THAI_MONTHS.map((label, idx) => ({ label, value: String(idx + 1) }));
  const dim = daysInMonth(y, m);
  const dayOptions = Array.from({ length: dim }, (_, i) => String(i + 1)).map((dd) => ({ label: dd, value: dd }));

  const setPart = (part: "d" | "m" | "y", newVal: number) => {
    let ny = y;
    let nm = m;
    let nd = d;
    if (part === "y") ny = newVal;
    if (part === "m") nm = newVal;
    if (part === "d") nd = newVal;
    const maxD = daysInMonth(ny, nm);
    if (nd > maxD) nd = maxD;
    onChange(`${ny}-${pad2(nm)}-${pad2(nd)}`);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={[styles.box, styles.boxDay]} onPress={() => setOpen("d")}>
          <Text style={styles.boxText}>{valid ? d : "วัน"}</Text>
        </Pressable>
        <Pressable style={[styles.box, styles.boxMonth]} onPress={() => setOpen("m")}>
          <Text style={styles.boxText} numberOfLines={1}>
            {valid ? THAI_MONTHS[m - 1] : "เดือน"}
          </Text>
        </Pressable>
        <Pressable style={[styles.box, styles.boxYear]} onPress={() => setOpen("y")}>
          <Text style={styles.boxText}>{valid ? y : "ปี"}</Text>
        </Pressable>
      </View>

      <ChoiceModal
        visible={open === "d"}
        title="วันที่"
        options={dayOptions}
        selected={String(d)}
        onSelect={(v) => setPart("d", Number(v))}
        onClose={() => setOpen(null)}
      />
      <ChoiceModal
        visible={open === "m"}
        title="เดือน"
        options={monthOptions}
        selected={String(m)}
        onSelect={(v) => setPart("m", Number(v))}
        onClose={() => setOpen(null)}
      />
      <ChoiceModal
        visible={open === "y"}
        title="ปี"
        options={yearOptions}
        selected={String(y)}
        onSelect={(v) => setPart("y", Number(v))}
        onClose={() => setOpen(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.inkSoft, fontWeight: "600", marginBottom: spacing.xs },
  row: { flexDirection: "row", gap: spacing.xs },
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  boxDay: { flex: 1 },
  boxMonth: { flex: 2 },
  boxYear: { flex: 1.2 },
  boxText: { fontSize: fontSize.base, color: colors.ink },
});
