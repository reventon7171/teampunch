import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Tag } from "../../components/Tag";
import { ErrorBanner } from "../../components/ErrorBanner";
import { PhotoViewerModal } from "../../components/PhotoViewerModal";
import { getAllLeaves, setLeaveStatus, deleteLeave } from "../../api/leaves";
import { getAllDayOffSwaps, setDayOffSwapStatus, deleteDayOffSwap } from "../../api/dayOffSwaps";
import { getAllOvertime, setOvertimeStatus, deleteOvertime } from "../../api/overtime";
import { listEmployees } from "../../api/employees";
import { TextField } from "../../components/TextField";
import { usePayrollConfig } from "../../hooks/usePayrollConfig";
import { hourlyRateOf } from "../../utils/salary";
import { OvertimeRequest } from "../../api/types";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, formatThaiDate, formatMoney } from "../../utils/format";
import { colors, fontSize, spacing } from "../../theme";

type Mode = "leave" | "swap" | "ot";

export function AdminLeavesScreen() {
  const [mode, setMode] = useState<Mode>("leave");

  return (
    <Screen>
      <Text style={styles.h1}>คำขอลา / สลับวันหยุด / OT</Text>
      <View style={styles.modeRow}>
        <Button title="คำขอลา" variant={mode === "leave" ? "navy" : "ghost"} onPress={() => setMode("leave")} />
        <Button title="คำขอสลับวันหยุด" variant={mode === "swap" ? "navy" : "ghost"} onPress={() => setMode("swap")} />
        <Button title="คำขอ OT" variant={mode === "ot" ? "navy" : "ghost"} onPress={() => setMode("ot")} />
      </View>

      {mode === "leave" ? <LeaveApprovalSection /> : mode === "swap" ? <SwapApprovalSection /> : <OvertimeApprovalSection />}
    </Screen>
  );
}

function LeaveApprovalSection() {
  const qc = useQueryClient();
  const { data: leaves } = useQuery({ queryKey: ["adminLeaves"], queryFn: () => getAllLeaves() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const [error, setError] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) => setLeaveStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminLeaves"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "อัปเดตสถานะไม่สำเร็จ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminLeaves"] }),
  });

  const confirmDelete = (id: string) => {
    Alert.alert("ลบคำขอลา", "ต้องการลบคำขอลานี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const nameOf = (employeeId: string) => employees?.find((e) => e.id === employeeId)?.name ?? "(ไม่พบพนักงาน)";

  return (
    <>
      <Text style={styles.sub}>อนุมัติ/ปฏิเสธคำขอลา — วันลาที่อนุมัติแล้วจะกันไม่ให้ตอกบัตรวันนั้น และมีผลต่อสิทธิ์โบนัส</Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {(!leaves || leaves.length === 0) && <Text style={styles.empty}>ยังไม่มีคำขอลา</Text>}
      {leaves?.map((lv) => (
        <Card key={lv.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {nameOf(lv.employeeId)} · {LEAVE_TYPE_LABELS[lv.type]}
              </Text>
              <Text style={styles.date}>{formatThaiDate(lv.date)}</Text>
              {lv.reason && <Text style={styles.reason}>{lv.reason}</Text>}
            </View>
            <Tag
              tone={lv.status === "APPROVED" ? "ontime" : lv.status === "REJECTED" ? "late" : "pending"}
              label={LEAVE_STATUS_LABELS[lv.status]}
            />
          </View>
          <View style={styles.actionsRow}>
            {lv.hasPhoto && (
              <Button
                title="ดูเอกสารแนบ"
                variant="ghost"
                onPress={() => {
                  setPhotoPath(`/api/leaves/${lv.id}/photo`);
                  setPhotoTitle(`${nameOf(lv.employeeId)} · เอกสารแนบ`);
                }}
              />
            )}
            {lv.status !== "APPROVED" && (
              <Button title="อนุมัติ" variant="green" onPress={() => statusMutation.mutate({ id: lv.id, status: "APPROVED" })} />
            )}
            {lv.status !== "REJECTED" && (
              <Button title="ปฏิเสธ" variant="ghost" onPress={() => statusMutation.mutate({ id: lv.id, status: "REJECTED" })} />
            )}
            <Button title="ลบ" variant="red" onPress={() => confirmDelete(lv.id)} />
          </View>
        </Card>
      ))}

      <PhotoViewerModal path={photoPath} title={photoTitle} onClose={() => setPhotoPath(null)} />
    </>
  );
}

function SwapApprovalSection() {
  const qc = useQueryClient();
  const { data: swaps } = useQuery({ queryKey: ["adminSwaps"], queryFn: () => getAllDayOffSwaps() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const [error, setError] = useState("");

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) => setDayOffSwapStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminSwaps"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "อัปเดตสถานะไม่สำเร็จ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDayOffSwap(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminSwaps"] }),
  });

  const confirmDelete = (id: string) => {
    Alert.alert("ลบคำขอสลับวันหยุด", "ต้องการลบคำขอนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const nameOf = (employeeId: string) => employees?.find((e) => e.id === employeeId)?.name ?? "(ไม่พบพนักงาน)";

  return (
    <>
      <Text style={styles.sub}>
        อนุมัติแล้ว: พนักงานเช็คอินในวันหยุดเดิมได้ตามปกติ และวันที่ขอสลับมาจะกลายเป็นวันหยุดแทน (ไม่นับขาดงาน)
      </Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {(!swaps || swaps.length === 0) && <Text style={styles.empty}>ยังไม่มีคำขอสลับวันหยุด</Text>}
      {swaps?.map((sw) => (
        <Card key={sw.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{nameOf(sw.employeeId)}</Text>
              <Text style={styles.date}>
                หยุด {formatThaiDate(sw.originalOffDate)} → สลับไปหยุด {formatThaiDate(sw.swappedToDate)}
              </Text>
              {sw.reason && <Text style={styles.reason}>{sw.reason}</Text>}
            </View>
            <Tag
              tone={sw.status === "APPROVED" ? "ontime" : sw.status === "REJECTED" ? "late" : "pending"}
              label={LEAVE_STATUS_LABELS[sw.status]}
            />
          </View>
          <View style={styles.actionsRow}>
            {sw.status !== "APPROVED" && (
              <Button title="อนุมัติ" variant="green" onPress={() => statusMutation.mutate({ id: sw.id, status: "APPROVED" })} />
            )}
            {sw.status !== "REJECTED" && (
              <Button title="ปฏิเสธ" variant="ghost" onPress={() => statusMutation.mutate({ id: sw.id, status: "REJECTED" })} />
            )}
            <Button title="ลบ" variant="red" onPress={() => confirmDelete(sw.id)} />
          </View>
        </Card>
      ))}
    </>
  );
}

function OvertimeApprovalSection() {
  const qc = useQueryClient();
  const { data: overtimeRequests } = useQuery({ queryKey: ["adminOvertime"], queryFn: () => getAllOvertime() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const payrollConfig = usePayrollConfig();
  const [error, setError] = useState("");
  // per-request draft baht amount the admin can edit before confirming approval — keyed by
  // request id, seeded lazily from the auto-calculated suggestion the first time it's touched
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});

  const statusMutation = useMutation({
    mutationFn: ({ id, status, approvedAmount }: { id: string; status: "APPROVED" | "REJECTED"; approvedAmount?: number | null }) =>
      setOvertimeStatus(id, status, approvedAmount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOvertime"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "อัปเดตสถานะไม่สำเร็จ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOvertime(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOvertime"] }),
  });

  const confirmDelete = (id: string) => {
    Alert.alert("ลบคำขอ OT", "ต้องการลบคำขอ OT นี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const nameOf = (employeeId: string) => employees?.find((e) => e.id === employeeId)?.name ?? "(ไม่พบพนักงาน)";

  // default suggestion: hours x employee's hourly rate x org's OT multiplier — the same
  // formula the server falls back to if the admin approves without editing this field
  const suggestedAmount = (ot: OvertimeRequest) => {
    const emp = employees?.find((e) => e.id === ot.employeeId);
    if (!emp) return 0;
    return Math.round(ot.hours * hourlyRateOf(emp) * payrollConfig.otRateMultiplier * 100) / 100;
  };

  const amountFor = (ot: OvertimeRequest) =>
    amountDrafts[ot.id] ?? String(ot.approvedAmount ?? suggestedAmount(ot));

  return (
    <>
      <Text style={styles.sub}>
        อนุมัติ/ปฏิเสธคำขอ OT — ตัวเลขบาทเติมให้อัตโนมัติจากสูตร (ชม. x ค่าแรง/ชม. x อัตรา OT) แก้ไขเองก่อนกดอนุมัติได้ เฉพาะที่อนุมัติแล้วจะถูกคำนวณรวมเข้าเงินเดือนงวดที่ครอบคลุมวันนั้น
      </Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {(!overtimeRequests || overtimeRequests.length === 0) && <Text style={styles.empty}>ยังไม่มีคำขอ OT</Text>}
      {overtimeRequests?.map((ot) => (
        <Card key={ot.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{nameOf(ot.employeeId)}</Text>
              <Text style={styles.date}>
                {formatThaiDate(ot.date)} · {ot.startTime}-{ot.endTime} · {ot.hours} ชม.
              </Text>
              {ot.reason && <Text style={styles.reason}>{ot.reason}</Text>}
              {ot.status === "APPROVED" && ot.approvedAmount != null && (
                <Text style={styles.reason}>อนุมัติแล้ว {formatMoney(ot.approvedAmount)} บาท</Text>
              )}
            </View>
            <Tag
              tone={ot.status === "APPROVED" ? "ontime" : ot.status === "REJECTED" ? "late" : "pending"}
              label={LEAVE_STATUS_LABELS[ot.status]}
            />
          </View>
          {ot.status !== "APPROVED" && (
            <TextField
              label="จำนวนเงิน OT ที่จะจ่าย (บาท)"
              value={amountFor(ot)}
              onChangeText={(v) => setAmountDrafts((d) => ({ ...d, [ot.id]: v }))}
              keyboardType="numeric"
            />
          )}
          <View style={styles.actionsRow}>
            {ot.status !== "APPROVED" && (
              <Button
                title="อนุมัติ"
                variant="green"
                onPress={() =>
                  statusMutation.mutate({ id: ot.id, status: "APPROVED", approvedAmount: Number(amountFor(ot)) || 0 })
                }
              />
            )}
            {ot.status !== "REJECTED" && (
              <Button title="ปฏิเสธ" variant="ghost" onPress={() => statusMutation.mutate({ id: ot.id, status: "REJECTED" })} />
            )}
            <Button title="ลบ" variant="red" onPress={() => confirmDelete(ot.id)} />
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink },
  modeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.md },
  sub: { fontSize: fontSize.sm, color: colors.inkSoft, marginBottom: spacing.md },
  empty: { textAlign: "center", color: colors.inkSoft, padding: spacing.xl },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontWeight: "700", color: colors.ink },
  date: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: 2 },
  reason: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: spacing.xs },
  actionsRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md, flexWrap: "wrap" },
});
