import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "../theme";
import { periodKeyFromDate, periodLabel, shiftPeriod, todayStr, PayrollConfig } from "../utils/period";
import { Button } from "./Button";

export function PeriodSwitcher({
  periodKey,
  config,
  onChange,
  extraNote,
}: {
  periodKey: string;
  config: PayrollConfig;
  onChange: (next: string) => void;
  extraNote?: string;
}) {
  const label = periodLabel(periodKey, config);
  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.range}>งวดเงินเดือน: วันที่ {label.rangeLabel}</Text>
        <Text style={styles.pay}>{label.payLabel}</Text>
        {extraNote && <Text style={styles.note}>{extraNote}</Text>}
      </View>
      <View style={styles.buttons}>
        <Button title="‹ ก่อน" variant="ghost" onPress={() => onChange(shiftPeriod(periodKey, -1, config))} />
        <Button title="ปัจจุบัน" variant="ghost" onPress={() => onChange(periodKeyFromDate(todayStr(), config))} />
        <Button title="ถัดไป ›" variant="ghost" onPress={() => onChange(shiftPeriod(periodKey, 1, config))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  range: { fontWeight: "700", fontSize: fontSize.base, color: colors.ink },
  pay: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: 2 },
  note: { fontSize: fontSize.xs, color: colors.inkSoft, marginTop: spacing.xs },
  buttons: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" },
});
