import { useState, useEffect } from "react";

// Simple localStorage cache for offline access to saved content.
export function cacheSet(key, value) {
  try {
    localStorage.setItem(`km_cache_${key}`, JSON.stringify(value));
  } catch (e) {}
}

export function cacheGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(`km_cache_${key}`);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
