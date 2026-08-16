import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { PeriodSwitcher } from "../../components/PeriodSwitcher";
import { TextField } from "../../components/TextField";
import { Tag } from "../../components/Tag";
import { getAllPayroll, setAdvance, setCommission } from "../../api/payroll";
import { periodInfo, periodKeyFromDate, todayStr } from "../../utils/period";
import { formatMoney } from "../../utils/format";
import { colors, fontSize, spacing } from "../../theme";
import { BONUS_AMOUNT } from "../../utils/constants";

export function AdminPayrollScreen() {
  const [periodKey, setPeriodKey] = useState(periodKeyFromDate(todayStr()));
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["adminPayroll", periodKey],
    queryFn: () => getAllPayroll(periodKey),
  });
  const info = periodInfo(periodKey);

  const advanceMutation = useMutation({
    mutationFn: ({ employeeId, amount }: { employeeId: string; amount: number }) =>
      setAdvance(employeeId, periodKey, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPayroll", periodKey] }),
  });

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
          onChange={setPeriodKey}
          extraNote={
            info.half === "H1"
              ? "จ่ายครึ่งเดือนแรก ไม่มีโบนัส/คอมมิชชั่น"
              : `จ่ายครึ่งเดือนหลัง รวมโบนัส/คอมมิชชั่นของทั้งเดือน · สาย/ลา/ขาดในเดือนนี้ = ไม่ได้โบนัส ${formatMoney(BONUS_AMOUNT)} บาท`
          }
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
            <Tag tone={p.absenceCount > 0 ? "late" : "ontime"} label={`ขาด ${p.absenceCount}`} />
          </View>

          <Row label="เงินเดือนครึ่งงวด" value={formatMoney(p.halfSalary)} />
          {p.employedDays < p.periodDays && (
            <Text style={styles.note}>
              เริ่มงานกลางงวด — คิดตามวันที่ทำงานจริง {p.employedDays}/{p.periodDays} วัน
            </Text>
          )}
          <Row label="หักสาย" value={formatMoney(p.lateDeduction)} />
          <Row label="หักลา" value={formatMoney(p.leaveDeduction)} />

          <TextField
            label="หักเบิกล่วงหน้า (บาท)"
            keyboardType="numeric"
            defaultValue={p.advanceAmount ? String(p.advanceAmount) : ""}
            placeholder="0"
            onEndEditing={(e) =>
              advanceMutation.mutate({ employeeId: p.employeeId, amount: Number(e.nativeEvent.text) || 0 })
            }
          />

          {p.isPayoutHalf ? (
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
            <Text style={styles.note}>คอมมิชชั่น/โบนัส: จ่ายวันที่ 1 (งวดหน้า)</Text>
          )}

          {p.isPayoutHalf && (
            <Row label="โบนัส" value={p.bonusEligible ? formatMoney(p.bonus) : "0.00"} highlight={p.bonusEligible} />
          )}

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>ยอดจ่ายสุทธิ</Text>
            <Text style={styles.netValue}>{formatMoney(p.net)} บาท</Text>
          </View>
        </Card>
      ))}
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
