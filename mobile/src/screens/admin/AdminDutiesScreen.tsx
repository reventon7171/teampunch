import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { ChoiceModal } from "../../components/ChoiceModal";
import { DateField } from "../../components/DateField";
import {
  getAllDuties,
  getDutyTasks,
  createDutyTask,
  setDutyTaskActive,
  getDutySchedule,
  setDutyScheduleRule,
  deleteDutyScheduleRule,
  setDutyAssignment,
} from "../../api/duties";
import { listEmployees } from "../../api/employees";
import { formatThaiDate, weekdayLabel } from "../../utils/format";
import { todayStr } from "../../utils/period";
import { colors, fontSize, radius, spacing } from "../../theme";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const RANDOM_VALUE = "__random__";

export function AdminDutiesScreen() {
  const qc = useQueryClient();
  const { data: duties } = useQuery({ queryKey: ["adminDuties"], queryFn: () => getAllDuties() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const { data: tasks } = useQuery({ queryKey: ["dutyTasks"], queryFn: getDutyTasks });
  const { data: schedule } = useQuery({ queryKey: ["dutySchedule"], queryFn: getDutySchedule });

  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [pickingWeekday, setPickingWeekday] = useState<number | null>(null);

  const [oneOffDate, setOneOffDate] = useState(todayStr());
  const [pickingOneOff, setPickingOneOff] = useState(false);

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

  const setRuleMutation = useMutation({
    mutationFn: ({ employeeId, weekday, taskId }: { employeeId: string; weekday: number; taskId: string }) =>
      setDutyScheduleRule(employeeId, weekday, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dutySchedule"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "บันทึกกำหนดการไม่สำเร็จ"),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => deleteDutyScheduleRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dutySchedule"] }),
  });

  const oneOffMutation = useMutation({
    mutationFn: ({ employeeId, date, taskId }: { employeeId: string; date: string; taskId: string }) =>
      setDutyAssignment(employeeId, date, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminDuties"] });
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "กำหนดหน้าที่ไม่สำเร็จ"),
  });

  const nameOf = (employeeId: string) => employees?.find((e) => e.id === employeeId)?.name ?? "(ไม่พบพนักงาน)";
  const activeTasks = tasks?.filter((t) => t.active) ?? [];
  const taskOptions = [{ label: "🎲 สุ่ม (ไม่กำหนดตายตัว)", value: RANDOM_VALUE }, ...activeTasks.map((t) => ({ label: t.label, value: t.id }))];

  const ruleFor = (employeeId: string, weekday: number) =>
    schedule?.find((r) => r.employeeId === employeeId && r.weekday === weekday);

  const onPickWeekdayTask = (weekday: number, value: string) => {
    if (!selectedEmployeeId) return;
    const existing = ruleFor(selectedEmployeeId, weekday);
    if (value === RANDOM_VALUE) {
      if (existing) deleteRuleMutation.mutate(existing.id);
      return;
    }
    setRuleMutation.mutate({ employeeId: selectedEmployeeId, weekday, taskId: value });
  };

  return (
    <Screen>
      <Text style={styles.h1}>หน้าที่ประจำวัน</Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <Card>
        <Text style={styles.cardTitle}>รายการหน้าที่ที่สุ่มได้</Text>
        <Text style={styles.sub}>
          พนักงานที่เปิด "รับหน้าที่ประจำวันแบบสุ่ม" จะได้รับหน้าที่จากรายการนี้แบบสุ่มทุกครั้งที่เช็คอิน — เว้นแต่จะมีกำหนดการตายตัวไว้แล้ว
          (ดูด้านล่าง) ซึ่งจะใช้ก่อนเสมอ
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

      <Card>
        <Text style={styles.cardTitle}>กำหนดหน้าที่ตายตัวรายสัปดาห์</Text>
        <Text style={styles.sub}>เลือกพนักงาน แล้วกำหนดว่าวันไหนได้หน้าที่อะไรตายตัว — วันที่ไม่กำหนดจะสุ่มตามปกติ</Text>

        <View style={styles.chipsRow}>
          {employees?.map((e) => {
            const active = selectedEmployeeId === e.id;
            return (
              <Pressable
                key={e.id}
                onPress={() => setSelectedEmployeeId(active ? undefined : e.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{e.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedEmployeeId &&
          WEEKDAYS.map((wd) => {
            const rule = ruleFor(selectedEmployeeId, wd);
            return (
              <Pressable key={wd} style={styles.weekdayRow} onPress={() => setPickingWeekday(wd)}>
                <Text style={styles.weekdayLabel}>{weekdayLabel(wd)}</Text>
                <Text style={[styles.weekdayValue, !rule && styles.weekdayValueRandom]}>
                  {rule ? rule.label : "🎲 สุ่ม"}
                </Text>
              </Pressable>
            );
          })}
        {!selectedEmployeeId && <Text style={styles.empty}>แตะเลือกพนักงานด้านบน</Text>}

        <ChoiceModal
          visible={pickingWeekday !== null}
          title={pickingWeekday !== null ? `หน้าที่วัน${weekdayLabel(pickingWeekday)}` : ""}
          options={taskOptions}
          selected={
            pickingWeekday !== null && selectedEmployeeId
              ? ruleFor(selectedEmployeeId, pickingWeekday)?.taskId ?? RANDOM_VALUE
              : RANDOM_VALUE
          }
          onSelect={(v) => pickingWeekday !== null && onPickWeekdayTask(pickingWeekday, v)}
          onClose={() => setPickingWeekday(null)}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>กำหนดหน้าที่วันที่เจาะจง</Text>
        <Text style={styles.sub}>สำหรับวันพิเศษวันเดียว — มีผลเหนือทั้งกำหนดการรายสัปดาห์และการสุ่ม</Text>

        <View style={styles.chipsRow}>
          {employees?.map((e) => {
            const active = selectedEmployeeId === e.id;
            return (
              <Pressable
                key={e.id}
                onPress={() => setSelectedEmployeeId(active ? undefined : e.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{e.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <DateField label="วันที่" value={oneOffDate} onChange={setOneOffDate} />

        <Pressable style={styles.pickTaskButton} onPress={() => setPickingOneOff(true)}>
          <Text style={styles.pickTaskButtonText}>แตะเพื่อเลือกหน้าที่</Text>
        </Pressable>

        <ChoiceModal
          visible={pickingOneOff}
          title="เลือกหน้าที่"
          options={activeTasks.map((t) => ({ label: t.label, value: t.id }))}
          selected=""
          onSelect={(taskId) => {
            if (!selectedEmployeeId) {
              setError("กรุณาเลือกพนักงานก่อน");
              return;
            }
            oneOffMutation.mutate({ employeeId: selectedEmployeeId, date: oneOffDate, taskId });
          }}
          onClose={() => setPickingOneOff(false)}
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
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: fontSize.sm, color: colors.ink },
  chipTextActive: { color: colors.white },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  weekdayLabel: { fontSize: fontSize.base, color: colors.ink, fontWeight: "600" },
  weekdayValue: { fontSize: fontSize.base, color: colors.navy, fontWeight: "700" },
  weekdayValueRandom: { color: colors.inkSoft, fontWeight: "600" },
  pickTaskButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  pickTaskButtonText: { color: colors.navy, fontWeight: "700" },
});
