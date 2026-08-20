import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ErrorBanner } from "../components/ErrorBanner";
import { useAuth } from "../context/AuthContext";
import { colors, fontSize, spacing } from "../theme";

export function AdminLoginScreen({ navigation }: NativeStackScreenProps<any>) {
  const { loginAdmin, error, clearError, lastSlug } = useAuth();
  const [slug, setSlug] = useState(lastSlug);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await loginAdmin(slug.trim().toLowerCase(), username.trim(), password);
    setLoading(false);
  };

  return (
    <Screen>
      <Text style={styles.title}>เข้าสู่ระบบแอดมิน</Text>
      <Text style={styles.sub}>กรุณาเข้าสู่ระบบเพื่อจัดการพนักงานและดูรายงานเงินเดือน</Text>
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
        <Pressable style={styles.forgotLink} onPress={() => navigation.navigate("AdminForgotPassword")}>
          <Text style={styles.forgotLinkText}>ลืมรหัสผ่าน?</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  sub: { fontSize: fontSize.base, color: colors.inkSoft, marginBottom: spacing.lg },
  forgotLink: { alignSelf: "center", paddingVertical: spacing.sm, marginTop: spacing.xs },
  forgotLinkText: { fontSize: fontSize.sm, color: colors.navy, fontWeight: "600", textDecorationLine: "underline" },
});
