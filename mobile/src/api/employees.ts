import { api } from "./client";
import { Employee } from "./types";

export interface EmployeeInput {
  name: string;
  position?: string;
  baseSalary: number;
  workStart: string;
  workEnd: string;
  daysOff: number[];
  hireDate: string;
  dutyRotationEnabled?: boolean;
  socialSecurityRate?: number;
  username: string;
  password?: string;
  active?: boolean;
}

export const listEmployees = async (): Promise<Employee[]> => {
  const { data } = await api.get<Employee[]>("/api/employees");
  return data;
};

export const getEmployee = async (id: string): Promise<Employee> => {
  const { data } = await api.get<Employee>(`/api/employees/${id}`);
  return data;
};

export const createEmployee = async (input: EmployeeInput): Promise<Employee> => {
  const { data } = await api.post<Employee>("/api/employees", input);
  return data;
};

export const updateEmployee = async (id: string, input: Partial<EmployeeInput>): Promise<Employee> => {
  const { data } = await api.patch<Employee>(`/api/employees/${id}`, input);
  return data;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await api.delete(`/api/employees/${id}`);
};
