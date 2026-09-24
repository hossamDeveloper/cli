import { useEffect } from "react";
import { getReminders, saveReminders, getAppointments, markExpiredAppointmentsAsAttended } from "../data/appointmentsStorage";
import { getCustomers } from "../data/customersStorage";
import { addNotification } from "../data/notificationsStorage";

const CHECK_INTERVAL_MS = 30_000; // فحص كل 30 ثانية

function formatArabicTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "مساءً" : "صباحًا";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function processDueReminders() {
  const attendedCount = markExpiredAppointmentsAsAttended();
  if (attendedCount > 0) window.dispatchEvent(new CustomEvent("appointments-updated"));
  const reminders = getReminders();
  const due = reminders.filter((r) => !r.sent && new Date(r.scheduledAt).getTime() <= Date.now());
  if (due.length === 0) return;

  const appointments = getAppointments();
  const customers = getCustomers();
  let changed = false;

  const updated = reminders.map((r) => {
    if (!due.includes(r)) return r;
    const appt = appointments.find((a) => a.id === r.appointmentId);
    if (!appt || ["ملغي", "تم الحضور", "مكتمل"].includes(appt.status)) return { ...r, sent: true };

    const customer = customers.find((c) => c.id === appt.customerId);
    const name = customer?.name || "العميل";
    const message =
      r.type === "24h"
        ? `لديك موعد مع ${name} غدًا الساعة ${formatArabicTime(appt.startTime)}.`
        : `لديك موعد مع ${name} بعد ساعة.`;

    addNotification({ type: "reminder", appointmentId: appt.id, message });

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("تذكير بموعد", { body: message });
      } catch {
        /* ignore browsers that block it */
      }
    }

    changed = true;
    return { ...r, sent: true };
  });

  if (changed) saveReminders(updated);
}

export function useReminderChecker() {
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    processDueReminders();
    const interval = setInterval(processDueReminders, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
