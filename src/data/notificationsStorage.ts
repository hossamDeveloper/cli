import { AppNotification } from "../types";
import { readList, writeList, STORAGE_KEYS } from "./storage";
import { genId } from "../utils/id";

export function getNotifications(): AppNotification[] {
  return readList<AppNotification>(STORAGE_KEYS.notifications).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function saveNotifications(notifications: AppNotification[]) {
  writeList(STORAGE_KEYS.notifications, notifications);
}
export function addNotification(data: Omit<AppNotification, "id" | "createdAt" | "read">): AppNotification {
  const notification: AppNotification = { ...data, id: genId(), createdAt: new Date().toISOString(), read: false };
  saveNotifications([notification, ...getNotifications()]);
  return notification;
}
export function markNotificationRead(id: string) {
  saveNotifications(getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)));
}
export function markAllNotificationsRead() {
  saveNotifications(getNotifications().map((n) => ({ ...n, read: true })));
}
export function unreadNotificationsCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}
