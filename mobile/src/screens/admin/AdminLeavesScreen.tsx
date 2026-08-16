import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Tag } from "../../components/Tag";
import { ErrorBanner } from "../../components/ErrorBanner";
import { getAllLeaves, setLeaveStatus, deleteLeave } from "../../api/leaves";
import { getAllDayOffSwaps, setDayOffSwapStatus, deleteDayOffSwap } from "../../api/dayOffSwaps";
import { listEmployees } from "../../api/employees";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, formatThaiDate } from "../../utils/format";
import { colors, fontSize, spacing } from "../../theme";

type Mode = "leave" | "swap";

export function AdminLeavesScreen() {
  const [mode, setMode] = useState<Mode>("leave");

  return (
    <Screen>
      <Text style={styles.h1}>คำขอลา / สลับวันหยุด</Text>
      <View style={styles.modeRow}>
        <Button title="คำขอลา" variant={mode === "leave" ? "navy" : "ghost"} onPress={() => setMode("leave")} />
        <Button title="คำขอสลับวันหยุด" variant={mode === "swap" ? "navy" : "ghost"} onPress={() => setMode("swap")} />
      </View>

      {mode === "leave" ? <LeaveApprovalSection /> : <SwapApprovalSection />}
    </Screen>
  );
}

function LeaveApprovalSection() {
  const qc = useQueryClient();
  const { data: leaves } = useQuery({ queryKey: ["adminLeaves"], queryFn: () => getAllLeaves() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const [error, setError] = useState("");

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
