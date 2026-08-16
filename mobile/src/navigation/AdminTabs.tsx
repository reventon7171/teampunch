import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme";
import { AdminEmployeesScreen } from "../screens/admin/AdminEmployeesScreen";
import { AdminPayrollScreen } from "../screens/admin/AdminPayrollScreen";
import { AdminHolidaysScreen } from "../screens/admin/AdminHolidaysScreen";
import { AdminLeavesScreen } from "../screens/admin/AdminLeavesScreen";
import { AdminDutiesScreen } from "../screens/admin/AdminDutiesScreen";
import { AdminSettingsScreen } from "../screens/admin/AdminSettingsScreen";

const Tab = createBottomTabNavigator();

const icon = (emoji: string) => ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{emoji}</Text>;

export function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: "#F2EFE4",
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.inkSoft,
      }}
    >
      <Tab.Screen
        name="Employees"
        component={AdminEmployeesScreen}
        options={{ title: "พนักงาน", tabBarIcon: icon("👤") }}
      />
      <Tab.Screen
        name="Payroll"
        component={AdminPayrollScreen}
        options={{ title: "เงินเดือน", tabBarIcon: icon("💰") }}
      />
      <Tab.Screen
        name="Leaves"
        component={AdminLeavesScreen}
        options={{ title: "คำขอลา", tabBarIcon: icon("📝") }}
      />
      <Tab.Screen
        name="Holidays"
        component={AdminHolidaysScreen}
        options={{ title: "วันหยุด", tabBarIcon: icon("🏖") }}
      />
      <Tab.Screen
        name="Duties"
        component={AdminDutiesScreen}
        options={{ title: "หน้าที่", tabBarIcon: icon("🧹") }}
      />
      <Tab.Screen
        name="Settings"
        component={AdminSettingsScreen}
        options={{ title: "ตั้งค่า", tabBarIcon: icon("⚙️") }}
      />
    </Tab.Navigator>
  );
}
