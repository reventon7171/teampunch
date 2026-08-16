import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { getAllDuties, getDutyTasks, createDutyTask, setDutyTaskActive } from "../../api/duties";
import { listEmployees } from "../../api/employees";
import { formatThaiDate } from "../../utils/format";
import { colors, fontSize, spacing } from "../../theme";

export function AdminDutiesScreen() {
  const qc = useQueryClient();
  const { data: duties } = useQuery({ queryKey: ["adminDuties"], queryFn: () => getAllDuties() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const { data: tasks } = useQuery({ queryKey: ["dutyTasks"], queryFn: getDutyTasks });

  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createDutyTask(newLabel.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dutyTasks"] });
      setNewLabel("");
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "เพิ่มหน้าที่ไม่สำเร็จ"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setDutyTaskActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dutyTasks"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "อัปเดตหน้าที่ไม่สำเร็จ"),
  });

  const nameOf = (employeeId: string) => employees?.find((e) => e.id === employeeId)?.name ?? "(ไม่พบพนักงาน)";

  return (
    <Screen>
      <Text style={styles.h1}>หน้าที่ประจำวัน</Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <Card>
        <Text style={styles.cardTitle}>รายการหน้าที่ที่สุ่มได้</Text>
        <Text style={styles.sub}>
          พนักงานที่เปิด "รับหน้าที่ประจำวันแบบสุ่ม" (ตั้งค่าได้ตอนเพิ่มพนักงาน) จะได้รับหน้าที่หนึ่งจากรายการนี้แบบสุ่มทุกครั้งที่เช็คอิน
        </Text>

        {tasks?.map((t) => (
          <View key={t.id} style={styles.taskRow}>
            <Text style={[styles.taskLabel, !t.active && styles.taskLabelInactive]}>{t.label}</Text>
            <Button
              title={t.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              variant="ghost"
              onPress={() => toggleMutation.mutate({ id: t.id, active: !t.active })}
            />
          </View>
        ))}

        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <TextField
              label="เพิ่มหน้าที่ใหม่"
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="เช่น เติมน้ำแข็ง, จัดโต๊ะเก้าอี้"
            />
          </View>
        </View>
        <Button
          title="+ เพิ่มหน้าที่"
          variant="green"
          onPress={() => createMutation.mutate()}
          disabled={!newLabel.trim()}
          loading={createMutation.isPending}
        />
      </Card>

      <Text style={styles.h1}>ประวัติหน้าที่ที่มอบหมายแล้ว</Text>
      <Text style={styles.sub}>ดูย้อนหลังได้ว่าใครรับผิดชอบอะไรวันไหน</Text>

      {(!duties || duties.length === 0) && <Text style={styles.empty}>ยังไม่มีประวัติ</Text>}
      {duties?.map((d) => (
        <Card key={d.id} style={styles.row}>
          <Text style={styles.icon}>🧹</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{nameOf(d.employeeId)}</Text>
            <Text style={styles.task}>{d.label}</Text>
          </View>
          <Text style={styles.date}>{formatThaiDate(d.date)}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink },
  cardTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  sub: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },
  empty: { textAlign: "center", color: colors.inkSoft, padding: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { fontSize: 22 },
  name: { fontWeight: "700", color: colors.ink },
  task: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: 2 },
  date: { fontSize: fontSize.sm, color: colors.inkSoft },
  taskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  taskLabel: { fontSize: fontSize.base, color: colors.ink, flex: 1, marginRight: spacing.sm },
  taskLabelInactive: { color: colors.inkSoft, textDecorationLine: "line-through" },
  addRow: { marginTop: spacing.md, flexDirection: "row" },
});
