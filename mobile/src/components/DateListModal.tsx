import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";
import { formatThaiDate, weekdayLabel } from "../utils/format";

// Bottom-sheet list of "YYYY-MM-DD" dates — used for drilling into a stat count (e.g. "ขาด 3
// วัน") to see which specific days it covers. When onMarkPresent is given (admin payroll only),
// each row gets a button to backfill a forgotten check-in without photo/GPS proof.
export function DateListModal({
  visible,
  title,
  dates,
  emptyText,
  onClose,
  onMarkPresent,
  markingDate,
}: {
  visible: boolean;
  title: string;
  dates: string[];
  emptyText?: string;
  onClose: () => void;
  onMarkPresent?: (date: string) => void;
  markingDate?: string | null;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list}>
            {dates.length === 0 ? (
              <Text style={styles.empty}>{emptyText ?? "ไม่มีข้อมูล"}</Text>
            ) : (
              dates.map((d) => (
                <View key={d} style={styles.row}>
                  <View>
                    <Text style={styles.rowText}>{formatThaiDate(d)}</Text>
                    <Text style={styles.rowSub}>{weekdayLabel(new Date(d + "T00:00:00").getDay())}</Text>
                  </View>
                  {onMarkPresent && (
                    <Pressable
                      style={styles.markButton}
                      onPress={() => onMarkPresent(d)}
                      disabled={markingDate === d}
                    >
                      <Text style={styles.markButtonText}>{markingDate === d ? "กำลังบันทึก…" : "ทำเครื่องหมายว่ามา"}</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>ปิด</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(13,13,13,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.md * 2,
    borderTopRightRadius: radius.md * 2,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "70%",
  },
  title: { fontSize: fontSize.md, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  list: { marginBottom: spacing.sm },
  empty: { textAlign: "center", color: colors.inkSoft, padding: spacing.lg },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: { fontSize: fontSize.base, color: colors.ink },
  rowSub: { fontSize: fontSize.sm, color: colors.inkSoft },
  markButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  markButtonText: { color: colors.white, fontSize: fontSize.xs, fontWeight: "600" },
  closeButton: { alignSelf: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.xs },
  closeButtonText: { color: colors.inkSoft, fontWeight: "600" },
});
