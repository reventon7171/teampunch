import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ErrorBanner } from "../components/ErrorBanner";
import { useAuth } from "../context/AuthContext";
import { colors, fontSize, spacing } from "../theme";

export function AdminLoginScreen() {
  const { loginAdmin, error, clearError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await loginAdmin(username.trim(), password);
    setLoading(false);
  };

  return (
    <Screen>
      <Text style={styles.title}>เข้าสู่ระบบแอดมิน</Text>
      <Text style={styles.sub}>กรุณาเข้าสู่ระบบเพื่อจัดการพนักงานและดูรายงานเงินเดือน</Text>
      <ErrorBanner message={error} onDismiss={clearError} />
      <Card>
        <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="เข้าสู่ระบบ" onPress={submit} disabled={!username || !password} loading={loading} fullWidth />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  sub: { fontSize: fontSize.base, color: colors.inkSoft, marginBottom: spacing.lg },
});
