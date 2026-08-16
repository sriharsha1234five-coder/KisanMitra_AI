import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("km_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errText(e, fallback = "Something went wrong. Please try again.") {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || "").join(" ") || fallback;
  return d?.msg || e?.message || fallback;
}
