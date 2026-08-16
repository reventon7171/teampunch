import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { createHoliday, deleteHoliday, listHolidays } from "../../api/holidays";
import { todayStr } from "../../utils/period";
import { colors, fontSize, spacing } from "../../theme";

export function AdminHolidaysScreen() {
  const qc = useQueryClient();
  const { data: holidays } = useQuery({ queryKey: ["holidays"], queryFn: listHolidays });
  const [date, setDate] = useState(todayStr());
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createHoliday(date, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      setName("");
      setError("");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "เพิ่มวันหยุดไม่สำเร็จ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holidays"] }),
  });

  const confirmDelete = (id: string, label: string) => {
    Alert.alert("ลบวันหยุด", `ต้องการลบ "${label}" ใช่หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.h1}>วันหยุดพิเศษ</Text>
      <Text style={styles.sub}>วันหยุดพิเศษ (เช่น วันหยุดนักขัตฤกษ์) จะมีผลกับพนักงานทุกคนในวันนั้น</Text>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <Card>
        <TextField label="วันที่ (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-08-15" />
        <TextField label="ชื่อวันหยุด" value={name} onChangeText={setName} placeholder="เช่น วันแม่แห่งชาติ" />
        <Button title="+ เพิ่มวันหยุด" variant="green" onPress={() => createMutation.mutate()} disabled={!date || !name} loading={createMutation.isPending} />
      </Card>

      {(!holidays || holidays.length === 0) && <Text style={styles.empty}>ยังไม่มีวันหยุดพิเศษ</Text>}
      {holidays?.map((h) => (
        <Card key={h.id}>
          <View style={styles.row}>
            <View>
              <Text style={styles.date}>{h.date}</Text>
              <Text style={styles.name}>{h.name}</Text>
            </View>
            <Button title="ลบ" variant="red" onPress={() => confirmDelete(h.id, h.name)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.lg, fontWeight: "700", color: colors.ink },
  sub: { fontSize: fontSize.sm, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.md },
  empty: { textAlign: "center", color: colors.inkSoft, padding: spacing.xl },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontWeight: "700", color: colors.ink },
  name: { fontSize: fontSize.sm, color: colors.inkSoft },
});
