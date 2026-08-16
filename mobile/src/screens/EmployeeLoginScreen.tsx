import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ErrorBanner } from "../components/ErrorBanner";
import { useAuth } from "../context/AuthContext";
import { colors, fontSize, spacing } from "../theme";

export function EmployeeLoginScreen() {
  const { loginEmployee, error, clearError, lastSlug } = useAuth();
  const [slug, setSlug] = useState(lastSlug);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await loginEmployee(slug.trim().toLowerCase(), username.trim(), password);
    setLoading(false);
  };

  return (
    <Screen>
      <Text style={styles.title}>เข้าสู่ระบบพนักงาน</Text>
      <Text style={styles.sub}>ใช้รหัสร้าน/บริษัท และ Username / Password ที่แอดมินตั้งให้ — ข้อมูลเงินเดือนของแต่ละคนเป็นความลับ</Text>
      <ErrorBanner message={error} onDismiss={clearError} />
      <Card>
        <TextField
          label="รหัสร้าน/บริษัท"
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="เช่น somchai-cafe"
        />
        <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button
          title="เข้าสู่ระบบ"
          onPress={submit}
          disabled={!slug || !username || !password}
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
