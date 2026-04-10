import axios from "axios";

export const API_URL = "https://mamalog-web.vercel.app";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "x-admin-key": "dev-admin-key-123",
  },
  timeout: 15000,
});
