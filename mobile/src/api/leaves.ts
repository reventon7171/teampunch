import { api } from "./client";
import { LeaveRequest, LeaveType } from "./types";
import { PunchPhoto } from "./attendance";

export const requestLeave = async (input: {
  date: string;
  type: LeaveType;
  reason?: string;
  photo?: PunchPhoto | null;
}): Promise<LeaveRequest> => {
  const form = new FormData();
  form.append("date", input.date);
  form.append("type", input.type);
  if (input.reason) form.append("reason", input.reason);
  if (input.photo) {
    form.append("photo", {
      uri: input.photo.uri,
      name: input.photo.fileName || "leave.jpg",
      type: input.photo.mimeType || "image/jpeg",
    } as any);
  }
  const { data } = await api.post<LeaveRequest>("/api/leaves", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getMyLeaves = async (): Promise<LeaveRequest[]> => {
  const { data } = await api.get<LeaveRequest[]>("/api/leaves/me");
  return data;
};

export const getAllLeaves = async (params: { employeeId?: string; status?: string } = {}) => {
  const { data } = await api.get<LeaveRequest[]>("/api/leaves", { params });
  return data;
};

export const setLeaveStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
  const { data } = await api.patch<LeaveRequest>(`/api/leaves/${id}/status`, { status });
  return data;
};

export const deleteLeave = async (id: string) => {
  await api.delete(`/api/leaves/${id}`);
};
