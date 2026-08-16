import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import { LoginHomeScreen } from "../screens/LoginHomeScreen";
import { AdminLoginScreen } from "../screens/AdminLoginScreen";
import { AdminRegisterScreen } from "../screens/AdminRegisterScreen";
import { EmployeeLoginScreen } from "../screens/EmployeeLoginScreen";
import { AdminTabs } from "./AdminTabs";
import { EmployeeTabs } from "./EmployeeTabs";

const Stack = createNativeStackNavigator();

function LoginStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.brandDark }, headerTintColor: "#F2EFE4" }}>
      <Stack.Screen name="LoginHome" component={LoginHomeScreen} options={{ title: "TeamPunch" }} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ title: "เข้าสู่ระบบแอดมิน" }} />
      <Stack.Screen name="AdminRegister" component={AdminRegisterScreen} options={{ title: "สมัครใช้งานฟรี" }} />
      <Stack.Screen name="EmployeeLogin" component={EmployeeLoginScreen} options={{ title: "เข้าสู่ระบบพนักงาน" }} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  if (!session) return <LoginStack />;
  if (session.role === "admin") return <AdminTabs />;
  return <EmployeeTabs />;
}
