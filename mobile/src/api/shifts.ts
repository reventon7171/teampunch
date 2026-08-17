import { api } from "./client";

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface ShiftInput {
  name: string;
  startTime: string;
  endTime: string;
}

export const listShifts = async (): Promise<Shift[]> => {
  const { data } = await api.get<Shift[]>("/api/shifts");
  return data;
};

export const createShift = async (input: ShiftInput): Promise<Shift> => {
  const { data } = await api.post<Shift>("/api/shifts", input);
  return data;
};

export const updateShift = async (id: string, input: Partial<ShiftInput>): Promise<Shift> => {
  const { data } = await api.patch<Shift>(`/api/shifts/${id}`, input);
  return data;
};

export const deleteShift = async (id: string): Promise<void> => {
  await api.delete(`/api/shifts/${id}`);
};
