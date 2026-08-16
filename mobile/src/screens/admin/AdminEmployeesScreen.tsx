import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Tag } from "../../components/Tag";
import { createEmployee, deleteEmployee, updateEmployee, listEmployees, EmployeeInput } from "../../api/employees";
import { Employee } from "../../api/types";
import { colors, fontSize, radius, spacing } from "../../theme";
import { weekdayLabel, formatThaiDate } from "../../utils/format";
import { hourlyRateOf } from "../../utils/salary";
import { formatMoney } from "../../utils/format";
import { POSITIONS } from "../../utils/constants";
import { formatTenure } from "../../utils/tenure";
import { todayStr } from "../../utils/period";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const emptyForm: EmployeeInput = {
  name: "",
  position: "",
  baseSalary: 0,
  workStart: "09:00",
  workEnd: "18:00",
  daysOff: [],
  hireDate: todayStr(),
  dutyRotationEnabled: false,
  username: "",
  password: "",
};

export function AdminEmployeesScreen() {
  const qc = useQueryClient();
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeInput>(emptyForm);
  const [error, setError] = useState("");

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      position: emp.position ?? "",
      baseSalary: emp.baseSalary,
      workStart: emp.workStart,
      workEnd: emp.workEnd,
      daysOff: emp.daysOff,
      hireDate: emp.hireDate ?? todayStr(),
      dutyRotationEnabled: emp.dutyRotationEnabled,
      username: emp.username,
      password: "",
    });
    setShowForm(true);
  };

  const createMutation = useMutation({
    mutationFn: () => createEmployee({ ...form, baseSalary: Number(form.baseSalary) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      closeForm();
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "บันทึกพนักงานไม่สำเร็จ"),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error("ไม่พบพนักงานที่จะแก้ไข");
      const { password, ...rest } = form;
      return updateEmployee(editingId, { ...rest, baseSalary: Number(form.baseSalary), ...(password ? { password } : {}) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      closeForm();
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "บันทึกการแก้ไขไม่สำเร็จ"),
  });

  const setActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateEmployee(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "อัปเดตสถานะพนักงานไม่สำเร็จ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "ลบพนักงานไม่สำเร็จ"),
  });

  const toggleDayOff = (v: number) => {
    setForm((f) => ({
      ...f,
      daysOff: f.daysOff.includes(v) ? f.daysOff.filter((d) => d !== v) : [...f.daysOff, v],
    }));
  };

  // deactivate is the default, safe, reversible action for an active employee — it blocks
  // login but keeps every attendance/leave/advance/commission record intact
  const confirmDeactivate = (id: string, name: string) => {
    Alert.alert(
      "ปิดใช้งานพนักงาน",
      `ปิดใช้งาน ${name} ใช่หรือไม่? พนักงานจะเข้าสู่ระบบไม่ได้ แต่ข้อมูลตอกบัตร/ลา/เงินเดือนที่ผ่านมาจะยังอยู่ครบ — เปิดใช้งานกลับได้ภายหลัง`,
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ปิดใช้งาน", onPress: () => setActiveMutation.mutate({ id, active: false }) },
      ]
    );
  };

  // permanent delete is only offered once an employee is already deactivated (backend also
  // enforces this) — a second, deliberate step so an accidental tap can never wipe an
  // active employee's payroll history in one go
  const confirmPermanentDelete = (id: string, name: string) => {
    Alert.alert(
      "ลบถาวร",
      `ลบ ${name} ถาวรใช่หรือไม่? การกระทำนี้ย้อนกลับไม่ได้ ข้อมูลตอกบัตร ประวัติการลา ยอดเบิกล่วงหน้า และคอมมิชชั่นทั้งหมดของพนักงานคนนี้จะถูกลบทิ้งถาวร`,
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบถาวร", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ]
    );
  };

  const canSubmit = editingId
    ? form.name && form.baseSalary > 0 && form.username && form.hireDate
    : form.name && form.baseSalary > 0 && form.username && form.password && form.hireDate;

  return (
    <Screen>
      <Text style={styles.h1}>พนักงานทั้งหมด {employees?.length ?? 0} คน</Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {!showForm && <Button title="+ เพิ่มพนักงานใหม่" variant="green" onPress={() => setShowForm(true)} />}

      {showForm && (
        <Card>
          <Text style={styles.formTitle}>{editingId ? "แก้ไขพนักงาน" : "เพิ่มพนักงานใหม่"}</Text>
          <TextField label="ชื่อ-นามสกุล" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />

          <TextField
            label="ตำแหน่ง (พิมพ์เองได้ หรือแตะเลือกจากด้านล่าง)"
            value={form.position}
            onChangeText={(v) => setForm({ ...form, position: v })}
            placeholder="เช่น เสิร์ฟ, บาร์, ผู้จัดการ"
          />
          <View style={styles.chipsRow}>
            {POSITIONS.map((p) => {
              const active = form.position === p;
              return (
                <Pressable key={p} onPress={() => setForm({ ...form, position: p })} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>รับหน้าที่ประจำวันแบบสุ่มตอนเช็คอิน</Text>
            <Switch
              value={!!form.dutyRotationEnabled}
              onValueChange={(v) => setForm({ ...form, dutyRotationEnabled: v })}
              trackColor={{ true: colors.navy }}
            />
          </View>

          <TextField
            label="เงินเดือนฐาน (บาท/เดือน)"
            value={form.baseSalary ? String(form.baseSalary) : ""}
            onChangeText={(v) => setForm({ ...form, baseSalary: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
            keyboardType="numeric"
          />
          <TextField label="Username" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })} autoCapitalize="none" />
          <TextField
            label={editingId ? "Password (เว้นว่างไว้ถ้าไม่เปลี่ยน)" : "Password"}
            value={form.password}
            onChangeText={(v) => setForm({ ...form, password: v })}
          />
          <TextField label="เวลาเข้างาน (HH:MM)" value={form.workStart} onChangeText={(v) => setForm({ ...form, workStart: v })} placeholder="09:00" />
          <TextField label="เวลาออกงาน (HH:MM)" value={form.workEnd} onChangeText={(v) => setForm({ ...form, workEnd: v })} placeholder="18:00" />
          <TextField
            label="วันที่เริ่มงาน (YYYY-MM-DD)"
            value={form.hireDate}
            onChangeText={(v) => setForm({ ...form, hireDate: v })}
            placeholder="2026-08-20"
          />

          <Text style={styles.label}>วันหยุดประจำสัปดาห์ของคนนี้</Text>
          <View style={styles.chipsRow}>
            {WEEKDAYS.map((v) => {
              const active = form.daysOff.includes(v);
              return (
                <Pressable key={v} onPress={() => toggleDayOff(v)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{weekdayLabel(v)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={editingId ? "บันทึกการแก้ไข" : "บันทึกพนักงาน"}
              variant="green"
              onPress={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
              disabled={!canSubmit}
              loading={editingId ? updateMutation.isPending : createMutation.isPending}
            />
            <Button title="ยกเลิก" variant="ghost" onPress={closeForm} />
          </View>
        </Card>
      )}

      {employees?.map((emp) => (
        <Card key={emp.id} style={!emp.active ? styles.inactiveCard : undefined}>
          <View style={styles.empRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.empNameRow}>
                <Text style={styles.empName}>{emp.name}</Text>
                {!emp.active && <Tag tone="late" label="ปิดใช้งานอยู่" />}
              </View>
              <Text style={styles.empPosition}>{emp.position || "—"}</Text>
              <Text style={styles.empDetail}>
                เข้า {emp.workStart} · ออก {emp.workEnd} · ฐาน {formatMoney(emp.baseSalary)} บาท/ด. · {formatMoney(hourlyRateOf(emp))} บาท/ชม.
              </Text>
              <Text style={styles.empDetail}>
                วันหยุดประจำสัปดาห์: {emp.daysOff.length ? emp.daysOff.map(weekdayLabel).join(", ") : "ไม่มี"}
              </Text>
              <Text style={styles.empDetail}>
                เริ่มงาน {emp.hireDate ? formatThaiDate(emp.hireDate) : "ไม่ระบุ"} · ทำงานมาแล้ว {formatTenure(emp.hireDate)}
              </Text>
              <Text style={styles.empDetail}>Username: {emp.username}</Text>
              {emp.dutyRotationEnabled && <Text style={styles.empDetail}>🧹 รับหน้าที่ประจำวันแบบสุ่ม</Text>}
            </View>
          </View>

          <View style={styles.empActionsRow}>
            <Button title="แก้ไข" variant="ghost" onPress={() => startEdit(emp)} />
            {emp.active ? (
              <Button title="ปิดใช้งาน" variant="ghost" onPress={() => confirmDeactivate(emp.id, emp.name)} />
            ) : (
              <>
                <Button
                  title="เปิดใช้งานอีกครั้ง"
                  variant="green"
                  onPress={() => setActiveMutation.mutate({ id: emp.id, active: true })}
                />
                <Button title="ลบถาวร" variant="red" onPress={() => confirmPermanentDelete(emp.id, emp.name)} />
              </>
            )}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  formTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.inkSoft, fontWeight: "600", marginBottom: spacing.xs },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  switchLabel: { fontSize: fontSize.sm, color: colors.ink, fontWeight: "600", flex: 1, marginRight: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: fontSize.sm, color: colors.ink },
  chipTextActive: { color: colors.white },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  empRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  empNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  empName: { fontWeight: "700", fontSize: fontSize.md, color: colors.ink },
  empPosition: { fontSize: fontSize.sm, color: colors.inkSoft },
  empDetail: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: 3 },
  empActionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  inactiveCard: { opacity: 0.65 },
});
