import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Tag } from "../../components/Tag";
import { getMyAttendance } from "../../api/attendance";
import { formatMoney, formatThaiDate } from "../../utils/format";
import { colors, fontSize, spacing } from "../../theme";

export function AttendanceHistoryScreen() {
  const { data: records } = useQuery({ queryKey: ["myAttendance"], queryFn: getMyAttendance });

  return (
    <Screen>
      <Text style={styles.h1}>ประวัติการตอกบัตร</Text>
      {(!records || records.length === 0) && <Text style={styles.empty}>ยังไม่มีประวัติ</Text>}
      {records?.map((r) => (
        <Card key={r.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.date}>{formatThaiDate(r.date)}</Text>
            {r.lateMinutes >= 1 ? (
              <Tag tone="late" label={`สาย ${r.lateMinutes} นาที`} />
            ) : (
              <Tag tone="ontime" label="ตรงเวลา" />
            )}
          </View>
          <View style={styles.timesRow}>
            <Text style={styles.time}>เข้า {r.checkInTime || "—"}</Text>
            <Text style={styles.time}>ออก {r.checkOutTime || "—"}</Text>
          </View>
          {r.deductionAmount > 0 && (
            <Text style={styles.deduction}>
              หัก {r.deductionHours} ชม. ({formatMoney(r.deductionAmount)} บาท)
            </Text>
          )}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, marginBottom: spacing.lg },
  empty: { textAlign: "center", color: colors.inkSoft, fontSize: fontSize.base, padding: spacing.xl },
  card: { paddingVertical: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  date: { fontWeight: "700", color: colors.ink },
  timesRow: { flexDirection: "row", gap: spacing.lg },
  time: { fontSize: fontSize.base, color: colors.inkSoft },
  deduction: { fontSize: fontSize.sm, color: colors.red, marginTop: spacing.xs },
});
