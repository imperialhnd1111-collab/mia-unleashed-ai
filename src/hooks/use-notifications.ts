import { useState, useEffect, useCallback } from "react";

export interface AppNotification {
  id: string;
  type: "sale" | "agent" | "content" | "interaction" | "system";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
  actionUrl?: string;
}

const STORAGE_KEY = "app_notifications";

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch {
    return [];
  }
}

function saveNotifications(notifs: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 100)));
}

let listeners: Array<() => void> = [];
let notificationsState: AppNotification[] = loadNotifications();

function notify() {
  listeners.forEach(fn => fn());
}

export function pushNotification(notif: Omit<AppNotification, "id" | "timestamp" | "read">) {
  const newNotif: AppNotification = {
    ...notif,
    id: crypto.randomUUID(),
    timestamp: new Date(),
    read: false,
  };
  notificationsState = [newNotif, ...notificationsState].slice(0, 100);
  saveNotifications(notificationsState);
  notify();
  return newNotif;
}

export function useNotifications() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  const markRead = useCallback((id: string) => {
    notificationsState = notificationsState.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(notificationsState);
    notify();
  }, []);

  const markAllRead = useCallback(() => {
    notificationsState = notificationsState.map(n => ({ ...n, read: true }));
    saveNotifications(notificationsState);
    notify();
  }, []);

  const clearAll = useCallback(() => {
    notificationsState = [];
    saveNotifications(notificationsState);
    notify();
  }, []);

  return {
    notifications: notificationsState,
    unreadCount: notificationsState.filter(n => !n.read).length,
    markRead,
    markAllRead,
    clearAll,
  };
}
