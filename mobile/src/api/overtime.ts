import { api } from "./client";
import { OvertimeRequest, LeaveStatus } from "./types";

export const requestOvertime = async (input: { date: string; startTime: string; endTime: string; reason?: string }) => {
  const { data } = await api.post<OvertimeRequest>("/api/overtime", input);
  return data;
};

export const getMyOvertime = async () => {
  const { data } = await api.get<OvertimeRequest[]>("/api/overtime/me");
  return data;
};

export const getAllOvertime = async (params: { employeeId?: string; status?: LeaveStatus } = {}) => {
  const { data } = await api.get<OvertimeRequest[]>("/api/overtime", { params });
  return data;
};

export const setOvertimeStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
  const { data } = await api.patch<OvertimeRequest>(`/api/overtime/${id}/status`, { status });
  return data;
};

export const deleteOvertime = async (id: string) => {
  await api.delete(`/api/overtime/${id}`);
};
