import { api } from "./client";
import { PayrollConfig } from "../utils/period";

export const getPayrollSettings = async (): Promise<PayrollConfig> => {
  const { data } = await api.get<PayrollConfig>("/api/payroll-settings");
  return data;
};

export const setPayrollSettings = async (config: PayrollConfig): Promise<PayrollConfig> => {
  const { data } = await api.put<PayrollConfig>("/api/payroll-settings", config);
  return data;
};
