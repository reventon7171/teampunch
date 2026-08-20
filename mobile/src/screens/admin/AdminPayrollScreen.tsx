import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { PeriodSwitcher } from "../../components/PeriodSwitcher";
import { TextField } from "../../components/TextField";
import { Tag } from "../../components/Tag";
import { DateListModal } from "../../components/DateListModal";
import { getAllPayroll, setAdvance, setCommission } from "../../api/payroll";
import { periodInfo, periodKeyFromDate, todayStr } from "../../utils/period";
import { usePayrollConfig } from "../../hooks/usePayrollConfig";
import { formatMoney } from "../../utils/format";
import { colors, fontSize, spacing } from "../../theme";

export function AdminPayrollScreen() {
  const config = usePayrollConfig();
  const [periodKey, setPeriodKey] = useState(periodKeyFromDate(todayStr(), config));
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["adminPayroll", periodKey],
    queryFn: () => getAllPayroll(periodKey),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ employeeId, amount }: { employeeId: string; amount: number }) =>
      setAdvance(employeeId, periodKey, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPayroll", periodKey] }),
  });

  const [absenceEmployeeId, setAbsenceEmployeeId] = useState<string | null>(null);

  const info = periodInfo(periodKey, config);
  const commissionMutation = useMutation({
    mutationFn: ({ employeeId, amount }: { employeeId: string; amount: number }) =>
      setCommission(employeeId, info.ym, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPayroll", periodKey] }),
  });

  return (
    <Screen>
      <Text style={styles.h1}>รายงานเงินเดือน</Text>
      <Card>
        <PeriodSwitcher
          periodKey={periodKey}
          config={config}
          onChange={setPeriodKey}
          extraNote="ค่าคอมมิชชั่นตั้งได้เดือนละครั้ง จะจ่ายรวมในงวดที่ครอบคลุมวันสิ้นเดือน"
        />
      </Card>

      {isLoading && <ActivityIndicator color={colors.navy} />}

      {rows?.map((p) => (
        <Card key={p.employeeId}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.position}>{p.position || "—"}</Text>

          <View style={styles.tagsRow}>
            <Tag tone={p.lateCount > 0 ? "late" : "ontime"} label={`สาย ${p.lateCount}`} />
            <Tag tone="pending" label={`ลา ${p.leaveCount}`} />
            <Pressable onPress={() => p.absenceCount > 0 && setAbsenceEmployeeId(p.employeeId)} disabled={p.absenceCount === 0}>
              <Tag tone={p.absenceCount > 0 ? "late" : "ontime"} label={`ขาด ${p.absenceCount}${p.absenceCount > 0 ? " ›" : ""}`} />
            </Pressable>
          </View>

          {p.wageType === "DAILY_WAGE" ? (
            <>
              <Row label={`ค่าจ้างงวดนี้ (มาทำงาน ${p.daysWorkedInPeriod} วัน)`} value={formatMoney(p.periodSalary)} />
              {p.dailyWageAbsenceDeduction > 0 && (
                <Row label={`หักขาดงาน (${p.absenceCount} วัน)`} value={formatMoney(p.dailyWageAbsenceDeduction)} />
              )}
            </>
          ) : (
            <>
              <Row label="เงินเดือนงวดนี้" value={formatMoney(p.periodSalary)} />
              {p.employedDays < p.periodDays && (
                <Text style={styles.note}>
                  เริ่มงานกลางงวด — คิดตามวันที่ทำงานจริง {p.employedDays}/{p.periodDays} วัน
                </Text>
              )}
              <Row label="หักสาย" value={formatMoney(p.lateDeduction)} />
              <Row label="หักลา" value={formatMoney(p.leaveDeduction)} />
            </>
          )}
          {p.socialSecurityDeduction > 0 && <Row label="หักประกันสังคม" value={formatMoney(p.socialSecurityDeduction)} />}

          <TextField
            label="หักเบิกล่วงหน้า (บาท)"
            keyboardType="numeric"
            defaultValue={p.advanceAmount ? String(p.advanceAmount) : ""}
            placeholder="0"
            onEndEditing={(e) =>
              advanceMutation.mutate({ employeeId: p.employeeId, amount: Number(e.nativeEvent.text) || 0 })
            }
          />

          {p.otHours > 0 && <Row label={`OT ที่อนุมัติแล้ว ${p.otHours} ชม.`} value={formatMoney(p.otAmount)} highlight />}

          {p.isCommissionPeriod ? (
            <TextField
              label="ค่าคอมมิชชั่น (บาท)"
              keyboardType="numeric"
              defaultValue={p.commissionAmount ? String(p.commissionAmount) : ""}
              placeholder="0"
              onEndEditing={(e) =>
                commissionMutation.mutate({ employeeId: p.employeeId, amount: Number(e.nativeEvent.text) || 0 })
              }
            />
          ) : (
            <Text style={styles.note}>ค่าคอมมิชชั่น: จ่ายรวมในงวดที่ครอบคลุมวันสิ้นเดือน</Text>
          )}

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>ยอดจ่ายสุทธิ</Text>
            <Text style={styles.netValue}>{formatMoney(p.net)} บาท</Text>
          </View>
        </Card>
      ))}

      <DateListModal
        visible={!!absenceEmployeeId}
        title={`วันที่ขาดงาน — ${rows?.find((r) => r.employeeId === absenceEmployeeId)?.name ?? ""}`}
        dates={rows?.find((r) => r.employeeId === absenceEmployeeId)?.absenceDates ?? []}
        onClose={() => setAbsenceEmployeeId(null)}
      />
    </Screen>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.green }]}>{value} บาท</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  name: { fontWeight: "700", fontSize: fontSize.md, color: colors.ink },
  position: { fontSize: fontSize.sm, color: colors.inkSoft, marginBottom: spacing.sm },
  tagsRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm, flexWrap: "wrap" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rowLabel: { fontSize: fontSize.sm, color: colors.inkSoft },
  rowValue: { fontSize: fontSize.sm, color: colors.ink, fontWeight: "600" },
  note: { fontSize: fontSize.xs, color: colors.inkSoft, marginBottom: spacing.md },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  netLabel: { fontWeight: "700", color: colors.ink },
  netValue: { fontWeight: "700", color: colors.ink },
});
