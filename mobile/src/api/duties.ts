import { api } from "./client";
import { DutyAssignment, DutyTaskOption, DutyScheduleRule } from "./types";

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

export const getDutySchedule = async () => {
  const { data } = await api.get<DutyScheduleRule[]>("/api/duties/schedule");
  return data;
};

export const setDutyScheduleRule = async (employeeId: string, weekday: number, taskId: string) => {
  const { data } = await api.put<DutyScheduleRule>("/api/duties/schedule", { employeeId, weekday, taskId });
  return data;
};

export const deleteDutyScheduleRule = async (id: string) => {
  await api.delete(`/api/duties/schedule/${id}`);
};

export const setDutyAssignment = async (employeeId: string, date: string, taskId: string) => {
  const { data } = await api.put<DutyAssignment>("/api/duties/assignments", { employeeId, date, taskId });
  return data;
};
