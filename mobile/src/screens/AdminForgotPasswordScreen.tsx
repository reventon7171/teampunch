import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ErrorBanner } from "../components/ErrorBanner";
import { forgotAdminPassword, resetAdminPassword } from "../api/auth";
import { colors, fontSize, spacing } from "../theme";

type Step = "request" | "reset" | "done";

export function AdminForgotPasswordScreen({ navigation }: NativeStackScreenProps<any>) {
  const [step, setStep] = useState<Step>("request");
  const [slug, setSlug] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const requestMutation = useMutation({
    mutationFn: () => forgotAdminPassword(slug.trim().toLowerCase(), username.trim()),
    onSuccess: () => {
      setError("");
      setStep("reset");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ"),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetAdminPassword(slug.trim().toLowerCase(), username.trim(), code.trim(), newPassword),
    onSuccess: () => {
      setError("");
      setStep("done");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "ตั้งรหัสผ่านใหม่ไม่สำเร็จ"),
  });

  return (
    <Screen>
      <Text style={styles.title}>ลืมรหัสผ่านแอดมิน</Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {step === "request" && (
        <Card>
          <Text style={styles.hint}>
            กรอกรหัสร้าน/บริษัท และ Username ของแอดมิน — ถ้ามีอีเมลผูกไว้กับบัญชีนี้ เราจะส่งรหัสยืนยัน 6 หลักไปให้
          </Text>
          <TextField label="รหัสร้าน/บริษัท" value={slug} onChangeText={setSlug} autoCapitalize="none" autoCorrect={false} />
          <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          <Button
            title="ส่งรหัสยืนยันไปที่อีเมล"
            variant="green"
            fullWidth
            onPress={() => requestMutation.mutate()}
            disabled={!slug || !username}
            loading={requestMutation.isPending}
          />
        </Card>
      )}

      {step === "reset" && (
        <Card>
          <Text style={styles.hint}>
            หากอีเมลผูกไว้กับบัญชีนี้ รหัสยืนยัน 6 หลักถูกส่งไปแล้ว (มีอายุ 15 นาที) กรอกรหัสและตั้งรหัสผ่านใหม่ด้านล่าง
          </Text>
          <TextField label="รหัสยืนยัน 6 หลัก" value={code} onChangeText={setCode} keyboardType="number-pad" />
          <TextField label="รหัสผ่านใหม่" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <Button
            title="ตั้งรหัสผ่านใหม่"
            variant="green"
            fullWidth
            onPress={() => resetMutation.mutate()}
            disabled={code.length !== 6 || !newPassword}
            loading={resetMutation.isPending}
          />
          <Button title="ขอรหัสยืนยันใหม่" variant="ghost" onPress={() => setStep("request")} />
        </Card>
      )}

      {step === "done" && (
        <Card>
          <Text style={styles.hint}>ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว — กลับไปหน้าเข้าสู่ระบบเพื่อล็อกอินด้วยรหัสผ่านใหม่</Text>
          <Button title="กลับไปหน้าเข้าสู่ระบบ" variant="green" fullWidth onPress={() => navigation.goBack()} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.sm, color: colors.inkSoft, marginBottom: spacing.md, lineHeight: 18 },
});
