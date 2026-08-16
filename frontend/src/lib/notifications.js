import { api } from "./api";
import { cacheGet, cacheSet } from "./offline";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsEnabled() {
  return notificationsSupported() && Notification.permission === "granted";
}

export async function requestNotifications() {
  if (!notificationsSupported()) return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function showNotification(title, body) {
  if (!notificationsEnabled()) return;
  try {
    new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png" });
  } catch (e) {}
}

// Fire reminders for tasks that are due today or overdue (once per task per day).
export async function runTaskReminders() {
  if (!notificationsEnabled()) return;
  let tasks = [];
  try {
    tasks = (await api.get("/tasks")).data;
  } catch (e) {
    tasks = cacheGet("tasks", []);
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const notified = cacheGet("km_notified", {});
  const todayKey = new Date().toISOString().slice(0, 10);
  let changed = false;
  tasks
    .filter((t) => !t.done && t.due)
    .forEach((t) => {
      const due = new Date(t.due);
      const key = `${t.id}_${todayKey}`;
      if (due <= today && !notified[key]) {
        showNotification("KisanMitra reminder", `${t.title} (due ${t.due})`);
        notified[key] = true;
        changed = true;
      }
    });
  if (changed) cacheSet("km_notified", notified);
}
