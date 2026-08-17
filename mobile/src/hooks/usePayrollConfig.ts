import { useQuery } from "@tanstack/react-query";
import { getPayrollSettings } from "../api/payrollSettings";
import { DEFAULT_PAYROLL_CONFIG, PayrollConfig } from "../utils/period";

// Shared everywhere a screen needs to render/navigate pay periods (admin and employee) — falls
// back to the default cadence (paid the 16th/1st) until the real org config has loaded.
export function usePayrollConfig(): PayrollConfig {
  const { data } = useQuery({ queryKey: ["payrollSettings"], queryFn: getPayrollSettings });
  return data ?? DEFAULT_PAYROLL_CONFIG;
}
