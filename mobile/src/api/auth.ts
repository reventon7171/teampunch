import { api } from "./client";
import { Employee } from "./types";

export const adminLogin = async (slug: string, username: string, password: string) => {
  const { data } = await api.post<{ token: string; admin: { id: string; username: string } }>(
    "/api/auth/admin/login",
    { slug, username, password }
  );
  return data;
};

export const employeeLogin = async (slug: string, username: string, password: string) => {
  const { data } = await api.post<{ token: string; employee: Employee }>("/api/auth/employee/login", {
    slug,
    username,
    password,
  });
  return data;
};

export type RegisterOrgResult = {
  token: string;
  organization: { id: string; name: string; slug: string };
  admin: { id: string; username: string };
};

export const registerOrg = async (
  organizationName: string,
  slug: string,
  adminUsername: string,
  adminPassword: string
) => {
  const { data } = await api.post<RegisterOrgResult>("/api/auth/admin/register", {
    organizationName,
    slug: slug || undefined,
    adminUsername,
    adminPassword,
  });
  return data;
};

export const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
  await api.patch("/api/admin/password", { currentPassword, newPassword });
};

export const setAdminEmail = async (email: string) => {
  const { data } = await api.patch<{ email: string }>("/api/admin/email", { email });
  return data;
};

export const getAdminMe = async () => {
  const { data } = await api.get<{ id: string; username: string; email: string | null }>("/api/admin/me");
  return data;
};

export const forgotAdminPassword = async (slug: string, username: string) => {
  const { data } = await api.post<{ message: string }>("/api/auth/admin/forgot-password", { slug, username });
  return data;
};

export const resetAdminPassword = async (slug: string, username: string, code: string, newPassword: string) => {
  await api.post("/api/auth/admin/reset-password", { slug, username, code, newPassword });
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
