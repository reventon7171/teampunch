import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { ChoiceModal } from "../../components/ChoiceModal";
import { changeAdminPassword, getWorkplaceLocation, setWorkplaceLocation, WorkplaceLocation } from "../../api/auth";
import { getPayrollSettings, setPayrollSettings } from "../../api/payrollSettings";
import { PayFrequency, PayrollConfig } from "../../utils/period";
import { weekdayLabel } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import { colors, fontSize, radius, spacing } from "../../theme";

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  WEEKLY: "รายสัปดาห์",
  MONTHLY: "รายเดือน (1 ครั้ง/เดือน)",
  SEMI_MONTHLY: "แบ่งจ่าย 2 งวด/เดือน",
};
const PAY_FREQUENCIES: PayFrequency[] = ["WEEKLY", "MONTHLY", "SEMI_MONTHLY"];
const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => ({ label: `วันที่ ${i + 1}`, value: String(i + 1) }));
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function AdminSettingsScreen() {
  const { session, logout } = useAuth();
  const qc = useQueryClient();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);

  const mutation = useMutation({
    mutationFn: () => changeAdminPassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setError("");
      setShowChangePassword(false);
      Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านแอดมินเรียบร้อยแล้ว");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ"),
  });

  const payrollQuery = useQuery({ queryKey: ["payrollSettings"], queryFn: getPayrollSettings });
  const [payroll, setPayroll] = useState<PayrollConfig | null>(null);
  const [payrollPicker, setPayrollPicker] = useState<null | "monthlyPayDay" | "semi1" | "semi2">(null);
  const [payrollError, setPayrollError] = useState("");

  useEffect(() => {
    if (payrollQuery.data) setPayroll(payrollQuery.data);
  }, [payrollQuery.data]);

  const payrollMutation = useMutation({
    mutationFn: (next: PayrollConfig) => setPayrollSettings(next),
    onSuccess: (data) => {
      setPayroll(data);
      qc.setQueryData(["payrollSettings"], data);
      setPayrollError("");
      Alert.alert("สำเร็จ", "บันทึกการตั้งค่าจ่ายเงินเดือนเรียบร้อยแล้ว");
    },
    onError: (e) => setPayrollError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
  });

  const locationQuery = useQuery({ queryKey: ["workplaceLocation"], queryFn: getWorkplaceLocation });
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("150");
  const [enabled, setEnabled] = useState(true);
  const [locError, setLocError] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const loc = locationQuery.data;
    if (loc) {
      setLat(String(loc.lat));
      setLng(String(loc.lng));
      setRadius(String(loc.radiusMeters));
      setEnabled(loc.enabled);
    }
  }, [locationQuery.data]);

  const useCurrentPosition = async () => {
    setLocError("");
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError("ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(String(pos.coords.latitude));
      setLng(String(pos.coords.longitude));
    } catch {
      setLocError("ไม่สามารถเข้าถึงตำแหน่งได้ ลองใหม่อีกครั้ง");
    } finally {
      setLocating(false);
    }
  };

  const locationMutation = useMutation({
    mutationFn: () => {
      const parsed: WorkplaceLocation = {
        lat: Number(lat),
        lng: Number(lng),
        radiusMeters: Math.round(Number(radius)),
        enabled,
      };
      return setWorkplaceLocation(parsed);
    },
    onSuccess: (data) => {
      setLocError("");
      qc.setQueryData(["workplaceLocation"], data);
      Alert.alert("สำเร็จ", "บันทึกตำแหน่งที่ทำงานเรียบร้อยแล้ว");
    },
    onError: (e) => setLocError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
  });

  const validLatLng = !isNaN(Number(lat)) && !isNaN(Number(lng)) && lat !== "" && lng !== "";
  const validRadius = !isNaN(Number(radius)) && Number(radius) >= 10;

  return (
    <Screen>
      <Text style={styles.h1}>ตั้งค่าแอดมิน</Text>
      <Text style={styles.sub}>เข้าสู่ระบบเป็น {session?.role === "admin" ? session.username : ""}</Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {!showChangePassword ? (
        <Pressable onPress={() => setShowChangePassword(true)} style={styles.linkButton}>
          <Text style={styles.linkButtonText}>เปลี่ยนรหัสผ่าน</Text>
        </Pressable>
      ) : (
        <Card>
          <TextField label="รหัสผ่านเดิม" value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
          <TextField label="รหัสผ่านแอดมินใหม่" value={newPw} onChangeText={setNewPw} secureTextEntry />
          <View style={styles.actionsRow}>
            <Button
              title="บันทึกรหัสผ่านใหม่"
              variant="green"
              onPress={() => mutation.mutate()}
              disabled={!currentPw || !newPw}
              loading={mutation.isPending}
            />
            <Button
              title="ยกเลิก"
              variant="ghost"
              onPress={() => {
                setShowChangePassword(false);
                setCurrentPw("");
                setNewPw("");
                setError("");
              }}
            />
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.cardTitle}>ล็อคระยะเช็คอิน (Geofence)</Text>
        <Text style={styles.hint}>
          พนักงานจะตอกบัตรได้เฉพาะเมื่ออยู่ในระยะที่กำหนดจากพิกัดนี้ ตรวจสอบที่ฝั่งเซิร์ฟเวอร์เสมอ ป้องกันการปลอมตำแหน่งจากแอพ
        </Text>
        <ErrorBanner message={locError} onDismiss={() => setLocError("")} />

        <View style={styles.enabledRow}>
          <Text style={styles.enabledLabel}>เปิดใช้งานล็อคระยะ</Text>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.green }} />
        </View>

        <Button
          title={locating ? "กำลังตรวจสอบตำแหน่ง..." : "📍 ใช้ตำแหน่งปัจจุบัน (ยืนที่ร้าน)"}
          variant="ghost"
          onPress={useCurrentPosition}
          disabled={locating}
        />

        <TextField label="ละติจูด (lat)" value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
        <TextField label="ลองจิจูด (lng)" value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
        <TextField label="รัศมีที่อนุญาต (เมตร)" value={radius} onChangeText={setRadius} keyboardType="number-pad" />

        <Button
          title="บันทึกตำแหน่งที่ทำงาน"
          variant="green"
          onPress={() => locationMutation.mutate()}
          disabled={!validLatLng || !validRadius}
          loading={locationMutation.isPending}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>รอบการจ่ายเงินเดือน</Text>
        <Text style={styles.hint}>
          กำหนดความถี่และวันจ่ายเงินของกิจการนี้เอง — แต่ละธุรกิจจ่ายไม่เหมือนกัน ค่าเริ่มต้นคือแบ่งจ่าย 2 งวด/เดือน (วันที่ 16 และ 1)
        </Text>
        <ErrorBanner message={payrollError} onDismiss={() => setPayrollError("")} />

        {payroll && (
          <>
            <Text style={styles.label}>ความถี่การจ่ายเงิน</Text>
            <View style={styles.frequencyRow}>
              {PAY_FREQUENCIES.map((freq) => (
                <Button
                  key={freq}
                  title={FREQUENCY_LABELS[freq]}
                  variant={payroll.payFrequency === freq ? "navy" : "ghost"}
                  onPress={() => setPayroll({ ...payroll, payFrequency: freq })}
                />
              ))}
            </View>

            {payroll.payFrequency === "WEEKLY" && (
              <>
                <Text style={styles.label}>จ่ายทุกวัน</Text>
                <View style={styles.chipsRow}>
                  {WEEKDAYS.map((v) => {
                    const active = payroll.weeklyPayWeekday === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setPayroll({ ...payroll, weeklyPayWeekday: v })}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{weekdayLabel(v)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {payroll.payFrequency === "MONTHLY" && (
              <>
                <Text style={styles.label}>จ่ายวันที่ (ของเดือนถัดไป)</Text>
                <Pressable style={styles.pickBox} onPress={() => setPayrollPicker("monthlyPayDay")}>
                  <Text style={styles.pickBoxText}>วันที่ {payroll.monthlyPayDay}</Text>
                </Pressable>
              </>
            )}

            {payroll.payFrequency === "SEMI_MONTHLY" && (
              <>
                <Text style={styles.hint}>
                  แต่ละงวดจะนับตั้งแต่วันถัดจากวันจ่ายก่อนหน้า ถึงวันจ่ายนี้ (จ่ายวันเดียวกับวันสิ้นสุดงวด) — เช่น ตั้งวันที่ 5 กับ 20:
                  งวดจ่ายวันที่ 5 จะครอบคลุมวันที่ 21 ของเดือนก่อน ถึงวันที่ 5, งวดจ่ายวันที่ 20 จะครอบคลุมวันที่ 6-20
                </Text>
                <Text style={styles.label}>จ่ายงวดแรกวันที่</Text>
                <Pressable style={styles.pickBox} onPress={() => setPayrollPicker("semi1")}>
                  <Text style={styles.pickBoxText}>วันที่ {payroll.semiMonthlyPayDay1}</Text>
                </Pressable>
                <Text style={styles.label}>จ่ายงวดที่สองวันที่</Text>
                <Pressable style={styles.pickBox} onPress={() => setPayrollPicker("semi2")}>
                  <Text style={styles.pickBoxText}>วันที่ {payroll.semiMonthlyPayDay2}</Text>
                </Pressable>
              </>
            )}

            <Text style={styles.label}>หักเงินมาสาย (ไม่บังคับ)</Text>
            <Text style={styles.hint}>
              เว้นว่างไว้ = คำนวณจากค่าแรงรายชั่วโมงของพนักงานแต่ละคน (ค่าเริ่มต้น) — ใส่ตัวเลขเพื่อกำหนดจำนวนบาทคงที่แทน
            </Text>
            <TextField
              label="สายชั่วโมงแรก (1-60 นาที) หักกี่บาท"
              value={payroll.lateDeductionFirstHour != null ? String(payroll.lateDeductionFirstHour) : ""}
              onChangeText={(v) =>
                setPayroll({ ...payroll, lateDeductionFirstHour: v === "" ? null : Number(v.replace(/[^0-9.]/g, "")) || 0 })
              }
              keyboardType="numeric"
              placeholder="เช่น 50"
            />
            <TextField
              label="สายชั่วโมงถัดไป (ต่อชั่วโมง) หักกี่บาท"
              value={payroll.lateDeductionPerExtraHour != null ? String(payroll.lateDeductionPerExtraHour) : ""}
              onChangeText={(v) =>
                setPayroll({
                  ...payroll,
                  lateDeductionPerExtraHour: v === "" ? null : Number(v.replace(/[^0-9.]/g, "")) || 0,
                })
              }
              keyboardType="numeric"
              placeholder="เช่น 100 (เว้นว่าง = เท่ากับชั่วโมงแรก)"
            />

            <View style={styles.enabledRow}>
              <Text style={styles.enabledLabel}>หักเงินพนักงานรายวันที่ขาดงาน</Text>
              <Switch
                value={payroll.dailyWageDeductAbsence}
                onValueChange={(v) => setPayroll({ ...payroll, dailyWageDeductAbsence: v })}
                trackColor={{ true: colors.navy }}
              />
            </View>
            <Text style={styles.hint}>
              เฉพาะพนักงาน "รายวัน" — ปกติวันที่ไม่มาทำงานจะไม่ได้เงินอยู่แล้ว ถ้าเปิดตัวนี้จะหักเพิ่มเป็นค่าปรับตามจำนวนบาทที่กำหนด
            </Text>
            {payroll.dailyWageDeductAbsence && (
              <TextField
                label="หักเงินกี่บาทต่อวันที่ขาด"
                value={
                  payroll.dailyWageAbsenceDeductionAmount != null ? String(payroll.dailyWageAbsenceDeductionAmount) : ""
                }
                onChangeText={(v) =>
                  setPayroll({
                    ...payroll,
                    dailyWageAbsenceDeductionAmount: v === "" ? null : Number(v.replace(/[^0-9.]/g, "")) || 0,
                  })
                }
                keyboardType="numeric"
                placeholder="เช่น 300"
              />
            )}

            <Button
              title="บันทึกรอบการจ่ายเงินเดือน"
              variant="green"
              onPress={() => payrollMutation.mutate(payroll)}
              loading={payrollMutation.isPending}
            />
          </>
        )}

        <ChoiceModal
          visible={payrollPicker === "monthlyPayDay"}
          title="จ่ายวันที่"
          options={DAY_OF_MONTH_OPTIONS}
          selected={payroll ? String(payroll.monthlyPayDay) : ""}
          onSelect={(v) => payroll && setPayroll({ ...payroll, monthlyPayDay: Number(v) })}
          onClose={() => setPayrollPicker(null)}
        />
        <ChoiceModal
          visible={payrollPicker === "semi1"}
          title="จ่ายงวดแรกวันที่"
          options={DAY_OF_MONTH_OPTIONS}
          selected={payroll ? String(payroll.semiMonthlyPayDay1) : ""}
          onSelect={(v) => payroll && setPayroll({ ...payroll, semiMonthlyPayDay1: Number(v) })}
          onClose={() => setPayrollPicker(null)}
        />
        <ChoiceModal
          visible={payrollPicker === "semi2"}
          title="จ่ายงวดที่สองวันที่"
          options={DAY_OF_MONTH_OPTIONS}
          selected={payroll ? String(payroll.semiMonthlyPayDay2) : ""}
          onSelect={(v) => payroll && setPayroll({ ...payroll, semiMonthlyPayDay2: Number(v) })}
          onClose={() => setPayrollPicker(null)}
        />
      </Card>

      <Button title="ออกจากระบบ" variant="red" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink },
  sub: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.md },
  linkButton: { alignSelf: "flex-start", paddingVertical: spacing.sm, marginBottom: spacing.md },
  linkButtonText: { fontSize: fontSize.sm, color: colors.navy, fontWeight: "600", textDecorationLine: "underline" },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  cardTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.xs, color: colors.inkSoft, marginBottom: spacing.sm },
  enabledRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  enabledLabel: { fontSize: fontSize.sm, color: colors.ink, fontWeight: "600" },
  label: { fontSize: fontSize.sm, color: colors.inkSoft, fontWeight: "600", marginBottom: spacing.xs, marginTop: spacing.xs },
  frequencyRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  pickBox: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  pickBoxText: { fontSize: fontSize.base, color: colors.ink },
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
});
