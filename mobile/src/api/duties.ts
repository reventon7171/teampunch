import { api } from "./client";
import { DutyAssignment, DutyTaskOption } from "./types";

export const getAllDuties = async (params: { employeeId?: string; from?: string; to?: string } = {}) => {
  const { data } = await api.get<DutyAssignment[]>("/api/duties", { params });
  return data;
};

export const getDutyTasks = async () => {
  const { data } = await api.get<DutyTaskOption[]>("/api/duties/tasks");
  return data;
};

export const createDutyTask = async (label: string) => {
  const { data } = await api.post<DutyTaskOption>("/api/duties/tasks", { label });
  return data;
};

export const setDutyTaskActive = async (id: string, active: boolean) => {
  const { data } = await api.patch<DutyTaskOption>(`/api/duties/tasks/${id}`, { active });
  return data;
};
