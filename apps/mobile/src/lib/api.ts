import axios from "axios";
import { API_URL, STORAGE_KEYS } from "./constants";
import { get } from "./storage";

export const api = axios.create({
  baseURL: API_URL,
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
  return config;
});
