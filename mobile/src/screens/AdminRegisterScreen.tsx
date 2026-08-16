import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ErrorBanner } from "../components/ErrorBanner";
import { useAuth } from "../context/AuthContext";
import { colors, fontSize, spacing } from "../theme";

// Public self-signup for a brand new business — creates the Organization and its first
// Admin account in one step. Free, no approval needed.
export function AdminRegisterScreen() {
  const { register, error, clearError } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await register(organizationName.trim(), slug.trim().toLowerCase(), adminUsername.trim(), adminPassword);
    setLoading(false);
  };

  return (
    <Screen>
      <Text style={styles.title}>สมัครใช้งานฟรี</Text>
      <Text style={styles.sub}>สร้างบัญชีให้ร้าน/บริษัทของคุณ แล้วเริ่มเพิ่มพนักงานได้เลย ไม่มีค่าใช้จ่าย</Text>
      <ErrorBanner message={error} onDismiss={clearError} />
      <Card>
        <TextField
          label="ชื่อร้าน/บริษัท"
          value={organizationName}
          onChangeText={setOrganizationName}
          placeholder="เช่น ร้านสมชายคาเฟ่"
        />
        <TextField
          label="รหัสร้าน/บริษัท (ไม่บังคับ — ใช้ตอน login)"
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="เว้นว่างให้ระบบตั้งให้อัตโนมัติ"
        />
        <TextField
          label="Username แอดมิน"
          value={adminUsername}
          onChangeText={setAdminUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField label="Password แอดมิน" value={adminPassword} onChangeText={setAdminPassword} secureTextEntry />
        <Button
          title="สร้างบัญชี"
          onPress={submit}
          disabled={!organizationName || !adminUsername || !adminPassword}
          loading={loading}
          fullWidth
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  sub: { fontSize: fontSize.base, color: colors.inkSoft, marginBottom: spacing.lg },
});
