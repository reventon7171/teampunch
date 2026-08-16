import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Tag } from "../../components/Tag";
import { Button } from "../../components/Button";
import { PhotoViewerModal } from "../../components/PhotoViewerModal";
import { getAllAttendance } from "../../api/attendance";
import { listEmployees } from "../../api/employees";
import { formatMoney, formatThaiDate } from "../../utils/format";
import { colors, fontSize, radius, spacing } from "../../theme";

export function AdminAttendanceScreen() {
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState<string>("");

  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const { data: records } = useQuery({
    queryKey: ["adminAttendance", employeeId],
    queryFn: () => getAllAttendance({ employeeId }),
  });

  const nameOf = (id: string) => employees?.find((e) => e.id === id)?.name ?? "(ไม่พบพนักงาน)";

  const openPhoto = (attendanceId: string, kind: "in" | "out", name: string) => {
    setPhotoPath(`/api/attendance/${attendanceId}/photo/${kind}`);
    setPhotoTitle(`${name} · ${kind === "in" ? "รูปเข้างาน" : "รูปออกงาน"}`);
  };

  return (
    <Screen>
      <Text style={styles.h1}>ประวัติการตอกบัตร</Text>
      <Text style={styles.sub}>ดูเวลาและรูปยืนยันตัวตนย้อนหลังของพนักงานแต่ละคน</Text>

      <View style={styles.chipsRow}>
        <Pressable
          onPress={() => setEmployeeId(undefined)}
          style={[styles.chip, employeeId === undefined && styles.chipActive]}
        >
          <Text style={[styles.chipText, employeeId === undefined && styles.chipTextActive]}>ทั้งหมด</Text>
        </Pressable>
        {employees?.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setEmployeeId(e.id)}
            style={[styles.chip, employeeId === e.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, employeeId === e.id && styles.chipTextActive]}>{e.name}</Text>
          </Pressable>
        ))}
      </View>

      {(!records || records.length === 0) && <Text style={styles.empty}>ยังไม่มีประวัติ</Text>}
      {records?.map((r) => (
        <Card key={r.id} style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{nameOf(r.employeeId)}</Text>
              <Text style={styles.date}>{formatThaiDate(r.date)}</Text>
            </View>
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
          <View style={styles.actionsRow}>
            {r.hasCheckInPhoto && (
              <Button title="ดูรูปเข้างาน" variant="ghost" onPress={() => openPhoto(r.id, "in", nameOf(r.employeeId))} />
            )}
            {r.hasCheckOutPhoto && (
              <Button title="ดูรูปออกงาน" variant="ghost" onPress={() => openPhoto(r.id, "out", nameOf(r.employeeId))} />
            )}
          </View>
        </Card>
      ))}

      <PhotoViewerModal path={photoPath} title={photoTitle} onClose={() => setPhotoPath(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink },
  sub: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.md },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: "600" },
  chipTextActive: { color: colors.white },
  empty: { textAlign: "center", color: colors.inkSoft, fontSize: fontSize.base, padding: spacing.xl },
  card: { paddingVertical: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontWeight: "700", color: colors.ink },
  date: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: 2 },
  timesRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xs },
  time: { fontSize: fontSize.base, color: colors.inkSoft },
  deduction: { fontSize: fontSize.sm, color: colors.red, marginTop: spacing.xs },
  actionsRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md, flexWrap: "wrap" },
});
