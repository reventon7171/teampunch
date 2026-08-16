import { api } from "./client";
import { Holiday } from "./types";

export const listHolidays = async (): Promise<Holiday[]> => {
  const { data } = await api.get<Holiday[]>("/api/holidays");
  return data;
};

export const createHoliday = async (date: string, name: string): Promise<Holiday> => {
  const { data } = await api.post<Holiday>("/api/holidays", { date, name });
  return data;
};

export const deleteHoliday = async (id: string): Promise<void> => {
  await api.delete(`/api/holidays/${id}`);
};
