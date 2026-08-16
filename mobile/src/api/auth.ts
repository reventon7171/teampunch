import { api } from "./client";
import { Employee } from "./types";

export const adminLogin = async (username: string, password: string) => {
  const { data } = await api.post<{ token: string; admin: { id: string; username: string } }>(
    "/api/auth/admin/login",
    { username, password }
  );
  return data;
};

export const employeeLogin = async (username: string, password: string) => {
  const { data } = await api.post<{ token: string; employee: Employee }>("/api/auth/employee/login", {
    username,
    password,
  });
  return data;
};

export const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
  await api.patch("/api/admin/password", { currentPassword, newPassword });
};

export type WorkplaceLocation = { lat: number; lng: number; radiusMeters: number; enabled: boolean };

export const getWorkplaceLocation = async () => {
  const { data } = await api.get<WorkplaceLocation | null>("/api/admin/location");
  return data;
};

export const setWorkplaceLocation = async (loc: WorkplaceLocation) => {
  const { data } = await api.put<WorkplaceLocation>("/api/admin/location", loc);
  return data;
};
