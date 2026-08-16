import { api } from "./client";
import { AttendanceRecord, CheckInResult, TodayStatus } from "./types";

export interface PunchPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

const buildPunchForm = (lat: number, lng: number, photo: PunchPhoto): FormData => {
  const form = new FormData();
  form.append("lat", String(lat));
  form.append("lng", String(lng));
  // React Native's FormData accepts this file-shaped object; the `as any` cast is required
  // because DOM lib's FormData typings don't model RN's native file append.
  form.append("photo", {
    uri: photo.uri,
    name: photo.fileName || "punch.jpg",
    type: photo.mimeType || "image/jpeg",
  } as any);
  return form;
};

export const checkIn = async (lat: number, lng: number, photo: PunchPhoto): Promise<CheckInResult> => {
  const { data } = await api.post<CheckInResult>("/api/attendance/check-in", buildPunchForm(lat, lng, photo), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const checkOut = async (lat: number, lng: number, photo: PunchPhoto): Promise<AttendanceRecord> => {
  const { data } = await api.post<AttendanceRecord>("/api/attendance/check-out", buildPunchForm(lat, lng, photo), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getTodayStatus = async (): Promise<TodayStatus> => {
  const { data } = await api.get<TodayStatus>("/api/attendance/today");
  return data;
};

export const getMyAttendance = async (): Promise<AttendanceRecord[]> => {
  const { data } = await api.get<AttendanceRecord[]>("/api/attendance/me");
  return data;
};

export const getAllAttendance = async (params: { employeeId?: string; from?: string; to?: string } = {}) => {
  const { data } = await api.get<AttendanceRecord[]>("/api/attendance", { params });
  return data;
};
