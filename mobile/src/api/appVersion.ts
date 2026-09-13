import { api } from "./client";

export type AppVersionInfo = { minVersion: string; iosUrl: string; androidUrl: string };

export const getAppVersionInfo = async (): Promise<AppVersionInfo> => {
  const { data } = await api.get<AppVersionInfo>("/api/app-version");
  return data;
};
