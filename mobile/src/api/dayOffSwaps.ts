import { api } from "./client";
import { DayOffSwapRequest, LeaveStatus } from "./types";

export const requestDayOffSwap = async (input: { originalOffDate: string; swappedToDate: string; reason?: string }) => {
  const { data } = await api.post<DayOffSwapRequest>("/api/day-off-swaps", input);
  return data;
};

export const getMyDayOffSwaps = async () => {
  const { data } = await api.get<DayOffSwapRequest[]>("/api/day-off-swaps/me");
  return data;
};

export const getAllDayOffSwaps = async (params: { employeeId?: string; status?: LeaveStatus } = {}) => {
  const { data } = await api.get<DayOffSwapRequest[]>("/api/day-off-swaps", { params });
  return data;
};

export const setDayOffSwapStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
  const { data } = await api.patch<DayOffSwapRequest>(`/api/day-off-swaps/${id}/status`, { status });
  return data;
};

export const deleteDayOffSwap = async (id: string) => {
  await api.delete(`/api/day-off-swaps/${id}`);
};
