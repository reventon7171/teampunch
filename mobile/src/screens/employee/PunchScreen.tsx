import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { Tag } from "../../components/Tag";
import { ErrorBanner } from "../../components/ErrorBanner";
import { StampedCapture, StampedCaptureHandle } from "../../components/StampedCapture";
import { ChoiceModal } from "../../components/ChoiceModal";
import { useAuth } from "../../context/AuthContext";
import { checkIn, getTodayStatus, PunchPhoto } from "../../api/attendance";
import { getMyPayroll } from "../../api/payroll";
import { setMyShift } from "../../api/employees";
import { listShifts } from "../../api/shifts";
import { periodKeyFromDate, todayStr } from "../../utils/period";
import { usePayrollConfig } from "../../hooks/usePayrollConfig";
import { colors, fontSize, radius, spacing } from "../../theme";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function PunchScreen() {
  const { session, logout, updateEmployeeSession } = useAuth();
  const employee = session?.role === "employee" ? session.employee : null;
  const clock = useClock();
  const qc = useQueryClient();

  const shiftsQuery = useQuery({ queryKey: ["shifts"], queryFn: listShifts });
  const [shiftPickerOpen, setShiftPickerOpen] = useState(false);
  const switchShiftMutation = useMutation({
    mutationFn: (shiftId: string) => setMyShift(shiftId),
    onSuccess: (updated) => {
      updateEmployeeSession(updated);
      qc.invalidateQueries({ queryKey: ["today"] });
    },
  });

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState("");
  const [photo, setPhoto] = useState<PunchPhoto | null>(null);
  const [error, setError] = useState("");
  const stampRef = useRef<StampedCaptureHandle>(null);

  const payrollConfig = usePayrollConfig();
  const todayQuery = useQuery({ queryKey: ["today"], queryFn: getTodayStatus });
  const currentPeriodKey = periodKeyFromDate(todayStr(), payrollConfig);
  const payrollQuery = useQuery({
    queryKey: ["myPayroll", currentPeriodKey],
    queryFn: () => getMyPayroll(currentPeriodKey),
  });

  const resetCapture = () => {
    setGeo(null);
    setGeoStatus("");
    setPhoto(null);
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const stamped = await stampRef.current!.capture();
      return checkIn(geo!.lat, geo!.lng, stamped);
    },
    onSuccess: () => {
      resetCapture();
      setError("");
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["myAttendance"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "เช็คอินไม่สำเร็จ"),
  });

  const captureLocation = async () => {
    setGeoStatus("กำลังขอตำแหน่ง...");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setGeoStatus("ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง");
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeoStatus("บันทึกตำแหน่งแล้ว");
    } catch {
      setGeoStatus("ไม่สามารถเข้าถึงตำแหน่งได้ ลองใหม่อีกครั้ง");
    }
  };

  const capturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("ไม่ได้รับอนุญาตให้ใช้กล้อง");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false, cameraType: ImagePicker.CameraType.front });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPhoto({ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType });
    }
  };

  if (!employee) return null;

  const today = todayQuery.data;
  const record = today?.record ?? null;
  const isOffToday = today?.isOffToday ?? false;
  const readyToSubmit = !!geo && !!photo;
  const alreadyCheckedIn = !!record?.checkInTime;
  const canCheckIn = !isOffToday && !alreadyCheckedIn;

  const p = payrollQuery.data;

  return (
    <View style={styles.root}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <ScrollHeader employee={employee} onLogout={logout} />

      <View style={styles.sheet}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <View style={styles.clockBlock}>
          <Text style={styles.shift}>
            กะงาน {employee.workStart}–{employee.workEnd}
          </Text>
          {!!shiftsQuery.data?.length && (
            <Pressable onPress={() => setShiftPickerOpen(true)}>
              <Text style={styles.switchShiftLink}>เปลี่ยนกะ</Text>
            </Pressable>
          )}
          <Text style={styles.clock}>{clock.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</Text>
        </View>

        <ChoiceModal
          visible={shiftPickerOpen}
          title="เลือกกะการทำงาน"
          options={(shiftsQuery.data ?? []).map((s) => ({ label: `${s.name} (${s.startTime}-${s.endTime})`, value: s.id }))}
          selected={employee.shiftId ?? ""}
          onSelect={(v) => switchShiftMutation.mutate(v)}
          onClose={() => setShiftPickerOpen(false)}
        />

        {isOffToday && !alreadyCheckedIn && today?.offReason && (
          <Tag
            tone="ontime"
            label={
              today.offReason.type === "holiday"
                ? `🏖 วันหยุดพิเศษ: ${today.offReason.name}`
                : today.offReason.type === "leave"
                ? `🏖 วันนี้คุณลาอยู่`
                : today.offReason.type === "swap"
                ? `🔁 วันหยุดที่ขอสลับมา`
                : `🏖 วันหยุดประจำสัปดาห์ (${today.offReason.weekday})`
            }
          />
        )}

        {canCheckIn && (
          <>
            <View style={styles.captureGrid}>
              <Pressable style={styles.captureCard} onPress={captureLocation}>
                <Text style={styles.captureIcon}>📍</Text>
                <Text style={styles.captureTitle}>ตำแหน่ง</Text>
                <Text style={[styles.captureSub, geo && styles.captureSubDone]}>
                  {geo ? "ยืนยันแล้ว" : geoStatus || "แตะเพื่อตรวจสอบ"}
                </Text>
              </Pressable>
              <Pressable style={styles.captureCard} onPress={capturePhoto}>
                <Text style={styles.captureIcon}>📷</Text>
                <Text style={styles.captureTitle}>รูปถ่าย</Text>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.thumb} />
                ) : (
                  <Text style={styles.captureSub}>แตะเพื่อถ่าย</Text>
                )}
              </Pressable>
            </View>

            {photo && geo && (
              <View style={styles.previewBlock}>
                <Text style={styles.previewLabel}>ตัวอย่างรูปที่จะบันทึก (มีวันที่ เวลา และแผนที่ตำแหน่ง)</Text>
                <StampedCapture ref={stampRef} photoUri={photo.uri} geo={geo} />
              </View>
            )}

            <Button
              title="🟢  เช็คอินเข้างาน"
              variant="navy"
              fullWidth
              disabled={!readyToSubmit}
              loading={checkInMutation.isPending}
              onPress={() => checkInMutation.mutate()}
            />
            {!readyToSubmit && <Text style={styles.hint}>ต้องตรวจสอบตำแหน่งและถ่ายรูปให้ครบก่อนตอกบัตร</Text>}
          </>
        )}

        {alreadyCheckedIn && (
          <View style={styles.doneCard}>
            <View style={styles.doneIconBox}>
              <Text style={styles.doneIconEmoji}>✅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doneText}>วันนี้คุณบันทึกการเข้างานแล้ว</Text>
              <Text style={styles.doneSub}>เข้างาน {record?.checkInTime}</Text>
            </View>
            {record && (record.lateMinutes >= 1 ? (
              <Tag tone="late" label={`สาย ${record.lateMinutes} นาที`} />
            ) : (
              <Tag tone="ontime" label="ตรงเวลา" />
            ))}
          </View>
        )}

        {p && (
          <>
            <Text style={styles.statsHeading}>สถิติงวดนี้</Text>
            <View style={styles.statsGrid}>
              <StatCard label="ขาด" value={p.absenceCount} />
              <StatCard label="ลา" value={p.leaveCount} />
              <StatCard label="สาย" value={p.lateCount} />
            </View>
          </>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

function ScrollHeader({
  employee,
  onLogout,
}: {
  employee: { name: string; position: string | null };
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>สวัสดี</Text>
        <Text style={styles.name}>{employee.name}</Text>
        {!!employee.position && <Text style={styles.position}>{employee.position}</Text>}
      </View>
      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutIcon}>⏻</Text>
      </Pressable>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  greeting: { fontSize: fontSize.sm, color: colors.onBlackMuted },
  name: { fontSize: fontSize.lg, fontWeight: "700", color: colors.white, marginTop: 2 },
  position: { fontSize: fontSize.sm, color: colors.navy, fontWeight: "600", marginTop: 4 },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blackSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutIcon: { fontSize: 15, color: colors.onBlackMuted },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.md * 4,
    borderTopRightRadius: radius.md * 4,
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  clockBlock: { alignItems: "center", paddingVertical: spacing.md },
  shift: { fontSize: fontSize.sm, color: colors.creamInkMuted, marginBottom: spacing.xs },
  switchShiftLink: {
    fontSize: fontSize.xs,
    color: colors.navy,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginBottom: spacing.xs,
  },
  clock: { fontSize: fontSize.clock, fontWeight: "700", color: colors.creamInk },
  captureGrid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  captureCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md * 2,
    borderWidth: 1,
    borderColor: colors.creamLine,
    padding: spacing.md,
  },
  captureIcon: { fontSize: 20, marginBottom: spacing.xs },
  captureTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.creamInk, marginBottom: 2 },
  captureSub: { fontSize: fontSize.xs, color: colors.creamInkMuted },
  captureSubDone: { color: colors.green, fontWeight: "600" },
  thumb: { width: 32, height: 32, borderRadius: radius.sm, marginTop: 2 },
  previewBlock: { marginBottom: spacing.md },
  previewLabel: { fontSize: fontSize.xs, color: colors.creamInkMuted, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.xs, color: colors.creamInkMuted, marginTop: spacing.xs, textAlign: "center" },
  doneCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md * 2,
    borderWidth: 1,
    borderColor: colors.creamLine,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  doneIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md * 2,
    backgroundColor: colors.greenBg,
    alignItems: "center",
    justifyContent: "center",
  },
  doneIconEmoji: { fontSize: 16 },
  doneText: { fontSize: fontSize.base, fontWeight: "700", color: colors.creamInk },
  doneSub: { fontSize: fontSize.xs, color: colors.creamInkMuted, marginTop: 2 },
  statsHeading: { fontSize: fontSize.base, fontWeight: "700", color: colors.creamInk, marginTop: spacing.lg, marginBottom: spacing.sm },
  statsGrid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md * 2,
    borderWidth: 1,
    borderColor: colors.creamLine,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  statLabel: { fontSize: fontSize.xs, color: colors.creamInkMuted, marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.xl, fontWeight: "700", color: colors.creamInk },
});
