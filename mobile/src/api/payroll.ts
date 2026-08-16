import { api } from "./client";
import { AdminPayrollRow, PayrollBreakdown } from "./types";

export const getMyPayroll = async (period: string): Promise<PayrollBreakdown> => {
  const { data } = await api.get<PayrollBreakdown>("/api/payroll/me", { params: { period } });
  return data;
};

export const getAllPayroll = async (period: string): Promise<AdminPayrollRow[]> => {
  const { data } = await api.get<AdminPayrollRow[]>("/api/payroll", { params: { period } });
  return data;
};

export const setAdvance = async (employeeId: string, periodKey: string, amount: number, note?: string) => {
  const { data } = await api.put("/api/payroll/advance", { employeeId, periodKey, amount, note });
  return data;
};

export const setCommission = async (employeeId: string, yearMonth: string, amount: number) => {
  const { data } = await api.put("/api/payroll/commission", { employeeId, yearMonth, amount });
  return data;
};
