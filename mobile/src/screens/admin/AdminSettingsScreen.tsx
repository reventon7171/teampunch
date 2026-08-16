import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { changeAdminPassword, getWorkplaceLocation, setWorkplaceLocation, WorkplaceLocation } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { colors, fontSize, spacing } from "../../theme";

export function AdminSettingsScreen() {
  const { session, logout } = useAuth();
  const qc = useQueryClient();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => changeAdminPassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setError("");
      Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านแอดมินเรียบร้อยแล้ว");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ"),
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

      <Card>
        <TextField label="รหัสผ่านเดิม" value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
        <TextField label="รหัสผ่านแอดมินใหม่" value={newPw} onChangeText={setNewPw} secureTextEntry />
        <Button
          title="บันทึกรหัสผ่านใหม่"
          variant="green"
          onPress={() => mutation.mutate()}
          disabled={!currentPw || !newPw}
          loading={mutation.isPending}
        />
      </Card>

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

      <Button title="ออกจากระบบ" variant="red" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink },
  sub: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.xs, color: colors.inkSoft, marginBottom: spacing.sm },
  enabledRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  enabledLabel: { fontSize: fontSize.sm, color: colors.ink, fontWeight: "600" },
});
