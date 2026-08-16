import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme";
import { PunchScreen } from "../screens/employee/PunchScreen";
import { MyPayrollScreen } from "../screens/employee/MyPayrollScreen";
import { LeaveScreen } from "../screens/employee/LeaveScreen";
import { AttendanceHistoryScreen } from "../screens/employee/AttendanceHistoryScreen";

const Tab = createBottomTabNavigator();

const icon = (emoji: string) => ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{emoji}</Text>;

export function EmployeeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: "#F2EFE4",
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.inkSoft,
      }}
    >
      <Tab.Screen name="Punch" component={PunchScreen} options={{ title: "ตอกบัตร", tabBarIcon: icon("🕘") }} />
      <Tab.Screen name="History" component={AttendanceHistoryScreen} options={{ title: "ประวัติ", tabBarIcon: icon("📅") }} />
      <Tab.Screen name="Leave" component={LeaveScreen} options={{ title: "ลางาน", tabBarIcon: icon("📝") }} />
      <Tab.Screen name="Payroll" component={MyPayrollScreen} options={{ title: "เงินเดือน", tabBarIcon: icon("💰") }} />
    </Tab.Navigator>
  );
}
