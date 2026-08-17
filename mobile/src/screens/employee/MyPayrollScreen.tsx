import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { PeriodSwitcher } from "../../components/PeriodSwitcher";
import { getMyPayroll } from "../../api/payroll";
import { getMyAttendance } from "../../api/attendance";
import { periodKeyFromDate, todayStr } from "../../utils/period";
import { usePayrollConfig } from "../../hooks/usePayrollConfig";
import { formatMoney, formatThaiDate } from "../../utils/format";
import { colors, fontSize, radius, spacing } from "../../theme";

export function MyPayrollScreen() {
  const config = usePayrollConfig();
  const [periodKey, setPeriodKey] = useState(periodKeyFromDate(todayStr(), config));
  const { data: p, isLoading } = useQuery({
    queryKey: ["myPayroll", periodKey],
    queryFn: () => getMyPayroll(periodKey),
  });
  const { data: attendance } = useQuery({ queryKey: ["myAttendance"], queryFn: getMyAttendance });

  const lateDays = (attendance ?? [])
    .filter((r) => p && r.date >= p.info.startDate && r.date <= p.info.endDate && r.lateMinutes >= 1)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <Screen>
      <Text style={styles.h1}>เงินเดือนของฉัน</Text>
      <Card>
        <PeriodSwitcher periodKey={periodKey} config={config} onChange={setPeriodKey} />
        {isLoading && <ActivityIndicator color={colors.navy} />}
        {p && (
          <View>
            {p.wageType === "DAILY_WAGE" ? (
              <Row label={`ค่าจ้างงวดนี้ (มาทำงาน ${p.daysWorkedInPeriod} วัน)`} value={`${formatMoney(p.periodSalary)} บาท`} />
            ) : (
              <>
                <Row label="เงินเดือนงวดนี้" value={`${formatMoney(p.periodSalary)} บาท`} />
                {p.employedDays < p.periodDays && (
                  <Text style={styles.note}>
                    เริ่มงานกลางงวด — คิดตามวันที่ทำงานจริง {p.employedDays}/{p.periodDays} วัน
                  </Text>
                )}
                <Row label={`สาย ${p.lateCount} ครั้ง`} value={`หัก ${formatMoney(p.lateDeduction)} บาท`} negative={p.lateDeduction > 0} />
                {lateDays.length > 0 && (
                  <View style={styles.lateList}>
                    {lateDays.map((r) => (
                      <View key={r.id} style={styles.lateRow}>
                        <Text style={styles.lateDate}>{formatThaiDate(r.date)}</Text>
                        <Text style={styles.lateHours}>
                          สาย {r.lateMinutes} นาที (นับเป็น {r.deductionHours} ชม.)
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                <Row
                  label={`ลาที่อนุมัติแล้ว ${p.leaveCount} วัน · ขาดงาน ${p.absenceCount} วัน`}
                  value={`หัก ${formatMoney(p.leaveDeduction)} บาท`}
                  negative={p.leaveDeduction > 0}
                />
              </>
            )}
            {p.socialSecurityDeduction > 0 && (
              <Row label="หักประกันสังคม" value={`หัก ${formatMoney(p.socialSecurityDeduction)} บาท`} negative />
            )}
            <Row label="หักเบิกล่วงหน้า" value={`${formatMoney(p.advanceAmount)} บาท`} negative={p.advanceAmount > 0} />

            {p.isCommissionPeriod ? (
              <Row label="ค่าคอมมิชชั่น" value={`+${formatMoney(p.commissionAmount)} บาท`} />
            ) : (
              <Text style={styles.note}>งวดนี้ไม่มีค่าคอมมิชชั่น (จะรวมจ่ายในงวดที่ครอบคลุมวันสิ้นเดือน)</Text>
            )}

            <View style={styles.netRow}>
              <Text style={styles.netLabel}>ยอดจ่ายสุทธิงวดนี้</Text>
              <Text style={styles.netValue}>{formatMoney(p.net)} บาท</Text>
            </View>
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, negative && { color: colors.red }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, marginBottom: spacing.lg },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  rowLabel: { fontSize: fontSize.base, color: colors.inkSoft, flexShrink: 1, marginRight: spacing.sm },
  rowValue: { fontSize: fontSize.base, color: colors.ink, fontWeight: "600" },
  lateList: {
    backgroundColor: colors.redBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    gap: 4,
  },
  lateRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  lateDate: { fontSize: fontSize.sm, color: colors.red, fontWeight: "700" },
  lateHours: { fontSize: fontSize.sm, color: colors.red, flexShrink: 1, textAlign: "right" },
  note: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: spacing.sm },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  netLabel: { fontSize: fontSize.md, fontWeight: "700", color: colors.ink },
  netValue: { fontSize: fontSize.md, fontWeight: "700", color: colors.ink },
});
