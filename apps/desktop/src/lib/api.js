import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "https://mamalog-web.vercel.app";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach admin token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers["x-admin-key"] = token;
  }
  return config;
});
