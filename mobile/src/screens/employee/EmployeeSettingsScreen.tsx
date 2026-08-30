import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { deleteMyAccount } from "../../api/employees";
import { useAuth } from "../../context/AuthContext";
import { colors, fontSize, spacing } from "../../theme";

export function EmployeeSettingsScreen() {
  const { session, logout } = useAuth();
  const name = session?.role === "employee" ? session.employee.name : "";

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteMyAccount(deletePw),
    onSuccess: () => logout(),
    onError: (e) => setDeleteError(e instanceof Error ? e.message : "ลบบัญชีไม่สำเร็จ"),
  });
  const confirmDeleteAccount = () => {
    Alert.alert(
      "ยืนยันการลบบัญชี",
      "การลบบัญชีจะลบข้อมูลของคุณถาวร ทั้งประวัติเช็คอิน ประวัติลางาน และเงินเดือน ไม่สามารถกู้คืนได้ ยืนยันหรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบถาวร", style: "destructive", onPress: () => deleteAccountMutation.mutate() },
      ]
    );
  };

  return (
    <Screen>
      <Text style={styles.h1}>ตั้งค่า</Text>
      <Text style={styles.sub}>เข้าสู่ระบบเป็น {name}</Text>

      <Card>
        <Text style={styles.cardTitle}>ลบบัญชี</Text>
        <Text style={styles.hint}>ลบบัญชีของคุณและข้อมูลทั้งหมดถาวร (ประวัติเช็คอิน ลางาน เงินเดือน) ไม่สามารถกู้คืนได้</Text>
        {!showDeleteAccount ? (
          <Button title="ลบบัญชี" variant="red" onPress={() => setShowDeleteAccount(true)} />
        ) : (
          <>
            <ErrorBanner message={deleteError} onDismiss={() => setDeleteError("")} />
            <TextField label="กรอกรหัสผ่านเพื่อยืนยัน" value={deletePw} onChangeText={setDeletePw} secureTextEntry />
            <View style={styles.actionsRow}>
              <Button
                title="ยืนยันลบบัญชีถาวร"
                variant="red"
                onPress={confirmDeleteAccount}
                disabled={!deletePw}
                loading={deleteAccountMutation.isPending}
              />
              <Button
                title="ยกเลิก"
                variant="ghost"
                onPress={() => {
                  setShowDeleteAccount(false);
                  setDeletePw("");
                  setDeleteError("");
                }}
              />
            </View>
          </>
        )}
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
  actionsRow: { flexDirection: "row", gap: spacing.sm },
});
