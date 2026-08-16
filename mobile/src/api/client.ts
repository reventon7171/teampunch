import axios, { AxiosError } from "axios";

const baseURL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({ baseURL, timeout: 20000 });

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string }>) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    const message = error.response?.data?.error || error.message || "เกิดข้อผิดพลาด";
    return Promise.reject(new Error(message));
  }
);
