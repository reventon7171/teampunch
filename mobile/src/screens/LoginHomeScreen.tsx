import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { colors, fontSize, radius, spacing } from "../theme";

export function LoginHomeScreen({ navigation }: NativeStackScreenProps<any>) {
  return (
    <Screen>
      <View style={styles.brandRow}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <View style={styles.brandText}>
          <Text style={styles.brand}>บขส. บาร์</Text>
          <Text style={styles.tagline}>ระบบเช็คอินพนักงาน + คำนวณเงินเดือน</Text>
        </View>
      </View>

      <Pressable style={styles.primaryTile} onPress={() => navigation.navigate("EmployeeLogin")}>
        <Text style={styles.primaryTileIcon}>🕘</Text>
        <Text style={styles.primaryTileTitle}>Check-in เข้างาน</Text>
        <Text style={styles.primaryTileDesc}>ตอกบัตรเข้า-ออกงาน ดูประวัติและเงินเดือนของตัวเอง</Text>
      </Pressable>

      <Pressable style={styles.adminLink} onPress={() => navigation.navigate("AdminLogin")}>
        <Text style={styles.adminLinkText}>สำหรับแอดมิน / ฝ่ายบุคคล</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xxl },
  logo: { width: 56, height: 56, borderRadius: radius.md },
  brandText: { flex: 1 },
  brand: { fontSize: fontSize.xl + 4, fontWeight: "800", color: colors.navy, letterSpacing: 0.3 },
  tagline: { fontSize: fontSize.base, color: colors.inkSoft, marginTop: spacing.xs },
  primaryTile: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: "center",
    marginBottom: spacing.xxl * 2,
  },
  primaryTileIcon: { fontSize: 40, marginBottom: spacing.sm },
  primaryTileTitle: { fontSize: fontSize.xl, fontWeight: "800", color: colors.white },
  primaryTileDesc: {
    fontSize: fontSize.base,
    color: colors.white,
    opacity: 0.85,
    marginTop: spacing.xs,
    lineHeight: 19,
    textAlign: "center",
  },
  adminLink: { alignSelf: "center", padding: spacing.sm },
  adminLinkText: { fontSize: fontSize.sm, color: colors.inkSoft, fontWeight: "600" },
});
