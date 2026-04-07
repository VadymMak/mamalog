import axios from "axios";
import { Config } from "./config";
import { STORAGE_KEYS } from "./constants";
import { get } from "./storage";

export const api = axios.create({
  baseURL: Config.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach auth token from storage on every request
api.interceptors.request.use(async (config) => {
  const token = await get<string>(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (Config.isDev) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (Config.isDev) {
      console.warn("[API] Error:", error?.response?.status, error?.message);
    }
    return Promise.reject(error);
  }
);
