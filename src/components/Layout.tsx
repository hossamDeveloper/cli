import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Users, CalendarDays, Bell, Moon, Sun, Menu, Settings, X } from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  getNotifications, markNotificationRead, markAllNotificationsRead, unreadNotificationsCount,
} from "../data/notificationsStorage";
import { readObject, writeObject, STORAGE_KEYS } from "../data/storage";
import { Settings as AppSettings } from "../types";
import { SettingsModal } from "./SettingsModal";

export default function Layout() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => readObject<AppSettings>(STORAGE_KEYS.settings, {}).privacyNoticeDismissed);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  function dismissBanner() {
    setBannerDismissed(true);
    const s = readObject<AppSettings>(STORAGE_KEYS.settings, {});
    writeObject(STORAGE_KEYS.settings, { ...s, privacyNoticeDismissed: true });
  }

  const nav = [
    { to: "/customers", label: "العملاء", icon: Users },
    { to: "/appointments", label: "المواعيد", icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen flex" dir="rtl" style={{ background: "var(--bg)" }}>
      <aside
        className={clsx(
          "surface border-l fixed md:static z-40 inset-y-0 right-0 w-64 flex flex-col transition-transform",
          mobileNavOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
        style={{ borderColor: "var(--border)" }}
      >
        <div className="h-16 flex items-center px-5 font-extrabold text-lg text-brand-600">نظام العملاء</div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                clsx("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition", isActive ? "bg-brand-600 text-white" : "surface-hover")
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 px-3 py-2.5 w-full rounded-xl text-sm surface-hover">
            <Settings size={18} /> الإعدادات والنسخ الاحتياطي
          </button>
        </div>
      </aside>

      {mobileNavOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileNavOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 surface border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-20" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg surface-hover" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
            <span className="font-bold hidden md:block">إدارة العملاء والمواعيد</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => setDark((d) => !d)} className="p-2 rounded-lg surface-hover" title="تبديل الوضع الليلي">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {!bannerDismissed && (
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-b" style={{ borderColor: "var(--border)" }}>
            <span>بياناتك محفوظة محليًا على هذا الجهاز والمتصفح فقط. احرص على تصدير نسخة Excel احتياطية بشكل دوري من الإعدادات.</span>
            <button onClick={dismissBanner}><X size={14} /></button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const notifications = getNotifications();
  const unread = unreadNotificationsCount();

  function markRead(id: string) { markNotificationRead(id); setTick((t) => t + 1); }
  function markAllRead() { markAllNotificationsRead(); setTick((t) => t + 1); }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="p-2 rounded-lg surface-hover relative" title="الإشعارات">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -left-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-80 surface border rounded-xl shadow-xl z-50 max-h-96 flex flex-col" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="font-bold text-sm">الإشعارات</span>
            <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">تحديد الكل كمقروء</button>
          </div>
          <div className="overflow-y-auto">
            {notifications.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>لا توجد إشعارات</p>}
            {notifications.map((n) => (
              <button key={n.id} onClick={() => markRead(n.id)} className={clsx("w-full text-right px-4 py-3 border-b surface-hover block", !n.read && "bg-brand-50 dark:bg-brand-900/10")} style={{ borderColor: "var(--border)" }}>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{n.message}</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
