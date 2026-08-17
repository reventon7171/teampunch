import { api } from "./client";

export interface BillingInfo {
  plan: string;
  subscriptionStatus: string;
  isLifetimeFree: boolean;
}

export const getBilling = async (): Promise<BillingInfo> => {
  const { data } = await api.get<BillingInfo>("/api/billing");
  return data;
};
