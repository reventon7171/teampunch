import React from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

// No back button, no dismiss — this screen replaces the whole app when the installed version
// is below the server's MIN_APP_VERSION (see api/appVersion.ts + App.tsx's UpdateGate).
export function ForceUpdateScreen({ storeUrl }: { storeUrl: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.icon}>⬆️</Text>
      <Text style={styles.title}>มีอัปเดตใหม่</Text>
      <Text style={styles.desc}>
        กรุณาอัปเดต TeamPunch เป็นเวอร์ชันล่าสุดก่อนใช้งานต่อ{"\n"}เวอร์ชันปัจจุบันของคุณเก่าเกินไปแล้ว
      </Text>
      <Pressable style={styles.button} onPress={() => Linking.openURL(storeUrl)}>
        <Text style={styles.buttonText}>{Platform.OS === "ios" ? "อัปเดตผ่าน App Store" : "ดาวน์โหลดเวอร์ชันล่าสุด"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  icon: { fontSize: 56, marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl + 4, fontWeight: "800", color: colors.navy, marginBottom: spacing.sm },
  desc: { fontSize: fontSize.base, color: colors.inkSoft, textAlign: "center", lineHeight: 22, marginBottom: spacing.xxl },
  button: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl },
  buttonText: { fontSize: fontSize.base, fontWeight: "800", color: colors.white },
});
