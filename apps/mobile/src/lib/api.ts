import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Config } from "./config";
import { STORAGE_KEYS } from "./constants";

export const api = axios.create({
  baseURL: Config.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach userId from storage on every request
api.interceptors.request.use(async (config) => {
  const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  if (userId) {
    config.headers.Authorization = `Bearer ${userId}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(error)
);
