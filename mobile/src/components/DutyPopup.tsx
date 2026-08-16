import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

export function DutyPopup({ visible, duty, onDismiss }: { visible: boolean; duty: string; onDismiss: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🧹</Text>
          </View>
          <Text style={styles.eyebrow}>หน้าที่ของคุณวันนี้</Text>
          <Text style={styles.duty}>{duty}</Text>
          <Pressable style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>รับทราบ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(13,13,13,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: radius.md * 3,
    padding: spacing.xxl,
    alignItems: "center",
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.md * 2,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  icon: { fontSize: 28 },
  eyebrow: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  duty: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.black,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    alignSelf: "stretch",
    alignItems: "center",
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: fontSize.base },
});
