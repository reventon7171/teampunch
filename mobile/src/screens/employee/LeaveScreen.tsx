import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { DateField } from "../../components/DateField";
import { TimeField } from "../../components/TimeField";
import { Tag } from "../../components/Tag";
import { ErrorBanner } from "../../components/ErrorBanner";
import { getMyLeaves, requestLeave } from "../../api/leaves";
import { getMyDayOffSwaps, requestDayOffSwap } from "../../api/dayOffSwaps";
import { getMyOvertime, requestOvertime } from "../../api/overtime";
import { PunchPhoto } from "../../api/attendance";
import { LeaveType } from "../../api/types";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, formatThaiDate, weekdayLabel } from "../../utils/format";
import { todayStr } from "../../utils/period";
import { useAuth } from "../../context/AuthContext";
import { colors, fontSize, radius, spacing } from "../../theme";

const LEAVE_TYPES: LeaveType[] = ["SICK", "PERSONAL"];

type Mode = "leave" | "swap" | "ot";

export function LeaveScreen() {
  const { session } = useAuth();
  const employee = session?.role === "employee" ? session.employee : null;
  const [mode, setMode] = useState<Mode>("leave");

  return (
    <Screen>
      <Text style={styles.h1}>ระบบลางาน / สลับวันหยุด / OT</Text>

      <View style={styles.modeRow}>
        <Button title="ขอลา" variant={mode === "leave" ? "navy" : "ghost"} onPress={() => setMode("leave")} />
        <Button title="ขอสลับวันหยุด" variant={mode === "swap" ? "navy" : "ghost"} onPress={() => setMode("swap")} />
        <Button title="ขอ OT" variant={mode === "ot" ? "navy" : "ghost"} onPress={() => setMode("ot")} />
      </View>

      {mode === "leave" ? (
        <LeaveSection />
      ) : mode === "swap" ? (
        <SwapSection daysOff={employee?.daysOff ?? []} />
      ) : (
        <OvertimeSection />
      )}
    </Screen>
  );
}

function LeaveSection() {
  const qc = useQueryClient();
  const { data: leaves } = useQuery({ queryKey: ["myLeaves"], queryFn: getMyLeaves });

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState<LeaveType>("SICK");
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState<PunchPhoto | null>(null);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => requestLeave({ date, type, reason: reason || undefined, photo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      setShowForm(false);
      setDate(todayStr());
      setType("SICK");
      setReason("");
      setPhoto(null);
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "ส่งคำขอลาไม่สำเร็จ"),
  });

  const attachPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("ไม่ได้รับอนุญาตให้เข้าถึงคลังรูปภาพ");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPhoto({ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType });
    }
  };

  return (
    <>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <Card>
        {!showForm && <Button title="+ ยื่นคำขอลา" onPress={() => setShowForm(true)} />}
        {showForm && (
          <View>
            <DateField label="วันที่ลา" value={date} onChange={setDate} />
            <Text style={styles.label}>ประเภทการลา</Text>
            <View style={styles.typeRow}>
              {LEAVE_TYPES.map((t) => (
                <Button
                  key={t}
                  title={LEAVE_TYPE_LABELS[t]}
                  variant={type === t ? "navy" : "ghost"}
                  onPress={() => setType(t)}
                />
              ))}
            </View>
            <TextField label="เหตุผล (ถ้ามี)" value={reason} onChangeText={setReason} />
            <View style={styles.photoRow}>
              <Button title="แนบรูปเอกสารประกอบ (ถ้ามี)" variant="ghost" onPress={attachPhoto} />
              {photo && <Image source={{ uri: photo.uri }} style={styles.thumb} />}
            </View>
            <Text style={styles.note}>
              ลาป่วย หักค่าแรง 1 วัน · ลากิจ วันจันทร์–พฤหัส หัก 1.5 เท่าของค่าแรง/วัน, ศุกร์–เสาร์–อาทิตย์ หัก 2 เท่า
            </Text>
            <View style={styles.actionsRow}>
              <Button title="ส่งคำขอลา" variant="green" onPress={() => mutation.mutate()} loading={mutation.isPending} />
              <Button title="ยกเลิก" variant="ghost" onPress={() => setShowForm(false)} />
            </View>
          </View>
        )}
      </Card>

      <Text style={styles.h2}>ประวัติการลา</Text>
      {(!leaves || leaves.length === 0) && <Text style={styles.empty}>ยังไม่มีประวัติการลา</Text>}
      {leaves?.map((lv) => (
        <Card key={lv.id} style={styles.rowCard}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowDate}>{formatThaiDate(lv.date)}</Text>
              <Text style={styles.rowSub}>{LEAVE_TYPE_LABELS[lv.type]}</Text>
            </View>
            <Tag
              tone={lv.status === "APPROVED" ? "ontime" : lv.status === "REJECTED" ? "late" : "pending"}
              label={LEAVE_STATUS_LABELS[lv.status]}
            />
          </View>
        </Card>
      ))}
    </>
  );
}

function SwapSection({ daysOff }: { daysOff: number[] }) {
  const qc = useQueryClient();
  const { data: swaps } = useQuery({ queryKey: ["mySwaps"], queryFn: getMyDayOffSwaps });

  const [showForm, setShowForm] = useState(false);
  const [originalOffDate, setOriginalOffDate] = useState("");
  const [swappedToDate, setSwappedToDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => requestDayOffSwap({ originalOffDate, swappedToDate, reason: reason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mySwaps"] });
      setShowForm(false);
      setOriginalOffDate("");
      setSwappedToDate("");
      setReason("");
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "ส่งคำขอสลับวันหยุดไม่สำเร็จ"),
  });

  const daysOffLabel = daysOff.length ? daysOff.map(weekdayLabel).join(", ") : "ไม่มี";
  const canSubmit = originalOffDate.length === 10 && swappedToDate.length === 10;

  return (
    <>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <Card>
        <Text style={styles.note}>วันหยุดประจำสัปดาห์ของคุณตอนนี้: {daysOffLabel}</Text>
        {!showForm && <Button title="+ ขอสลับวันหยุด" onPress={() => setShowForm(true)} />}
        {showForm && (
          <View>
            <DateField
              label="วันหยุดเดิมที่จะขอมาทำงานแทน (ต้องตรงกับวันหยุดประจำสัปดาห์ของคุณ)"
              value={originalOffDate}
              onChange={setOriginalOffDate}
              yearRange={[new Date().getFullYear(), new Date().getFullYear() + 1]}
            />
            <DateField
              label="วันที่จะขอหยุดแทน (ต้องเป็นวันทำงานปกติ)"
              value={swappedToDate}
              onChange={setSwappedToDate}
              yearRange={[new Date().getFullYear(), new Date().getFullYear() + 1]}
            />
            <TextField label="เหตุผล (ถ้ามี)" value={reason} onChangeText={setReason} />
            <Text style={styles.note}>
              เมื่อแอดมินอนุมัติแล้ว จะเช็คอินได้ตามปกติในวันหยุดเดิม และวันที่ขอสลับมาจะกลายเป็นวันหยุดของคุณแทน (ไม่นับขาดงาน)
            </Text>
            <View style={styles.actionsRow}>
              <Button
                title="ส่งคำขอสลับวันหยุด"
                variant="green"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={!canSubmit}
              />
              <Button title="ยกเลิก" variant="ghost" onPress={() => setShowForm(false)} />
            </View>
          </View>
        )}
      </Card>

      <Text style={styles.h2}>ประวัติคำขอสลับวันหยุด</Text>
      {(!swaps || swaps.length === 0) && <Text style={styles.empty}>ยังไม่มีคำขอสลับวันหยุด</Text>}
      {swaps?.map((sw) => (
        <Card key={sw.id} style={styles.rowCard}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowDate}>
                หยุด {formatThaiDate(sw.originalOffDate)} → สลับไปหยุด {formatThaiDate(sw.swappedToDate)}
              </Text>
              {sw.reason && <Text style={styles.rowSub}>{sw.reason}</Text>}
            </View>
            <Tag
              tone={sw.status === "APPROVED" ? "ontime" : sw.status === "REJECTED" ? "late" : "pending"}
              label={LEAVE_STATUS_LABELS[sw.status]}
            />
          </View>
        </Card>
      ))}
    </>
  );
}

function OvertimeSection() {
  const qc = useQueryClient();
  const { data: overtimeRequests } = useQuery({ queryKey: ["myOvertime"], queryFn: getMyOvertime });

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => requestOvertime({ date, startTime, endTime, reason: reason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOvertime"] });
      setShowForm(false);
      setDate(todayStr());
      setStartTime("18:00");
      setEndTime("20:00");
      setReason("");
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "ส่งคำขอ OT ไม่สำเร็จ"),
  });

  return (
    <>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <Card>
        {!showForm && <Button title="+ ยื่นคำขอ OT" onPress={() => setShowForm(true)} />}
        {showForm && (
          <View>
            <DateField label="วันที่ทำ OT" value={date} onChange={setDate} />
            <TimeField label="เวลาเริ่ม OT" value={startTime} onChange={setStartTime} />
            <TimeField label="เวลาสิ้นสุด OT" value={endTime} onChange={setEndTime} />
            <TextField label="เหตุผล (ถ้ามี)" value={reason} onChangeText={setReason} />
            <Text style={styles.note}>เมื่อแอดมินอนุมัติแล้ว ชั่วโมง OT จะถูกคำนวณรวมเข้าเงินเดือนงวดที่ครอบคลุมวันนั้นอัตโนมัติ</Text>
            <View style={styles.actionsRow}>
              <Button title="ส่งคำขอ OT" variant="green" onPress={() => mutation.mutate()} loading={mutation.isPending} />
              <Button title="ยกเลิก" variant="ghost" onPress={() => setShowForm(false)} />
            </View>
          </View>
        )}
      </Card>

      <Text style={styles.h2}>ประวัติคำขอ OT</Text>
      {(!overtimeRequests || overtimeRequests.length === 0) && <Text style={styles.empty}>ยังไม่มีคำขอ OT</Text>}
      {overtimeRequests?.map((ot) => (
        <Card key={ot.id} style={styles.rowCard}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowDate}>{formatThaiDate(ot.date)}</Text>
              <Text style={styles.rowSub}>
                {ot.startTime}-{ot.endTime} · {ot.hours} ชม.
              </Text>
            </View>
            <Tag
              tone={ot.status === "APPROVED" ? "ontime" : ot.status === "REJECTED" ? "late" : "pending"}
              label={LEAVE_STATUS_LABELS[ot.status]}
            />
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  h2: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm, marginTop: spacing.sm },
  modeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, color: colors.inkSoft, fontWeight: "600", marginBottom: spacing.xs },
  typeRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md, flexWrap: "wrap" },
  photoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  note: { fontSize: fontSize.xs, color: colors.inkSoft, marginBottom: spacing.md, lineHeight: 16 },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  empty: { textAlign: "center", color: colors.inkSoft, fontSize: fontSize.base, padding: spacing.xl },
  rowCard: { marginBottom: spacing.sm, padding: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowDate: { fontWeight: "700", color: colors.ink, flexShrink: 1, marginRight: spacing.sm },
  rowSub: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: 2 },
});
