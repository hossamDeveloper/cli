import { Appointment, Reminder } from "../types";
import { readList, writeList, STORAGE_KEYS } from "./storage";
import { genId } from "../utils/id";

// ---- Appointments ----
export function getAppointments(): Appointment[] {
  return readList<Appointment>(STORAGE_KEYS.appointments);
}
export function saveAppointments(appointments: Appointment[]) {
  writeList(STORAGE_KEYS.appointments, appointments);
}
export function getAppointmentsForCustomer(customerId: string): Appointment[] {
  return getAppointments()
    .filter((a) => a.customerId === customerId)
    .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
}
export function addAppointment(data: Omit<Appointment, "id" | "createdAt" | "updatedAt">): Appointment {
  const now = new Date().toISOString();
  const appt: Appointment = { ...data, id: genId(), createdAt: now, updatedAt: now };
  saveAppointments([appt, ...getAppointments()]);
  regenerateReminders(appt);
  return appt;
}
export function updateAppointment(id: string, data: Partial<Appointment>): Appointment | null {
  const appts = getAppointments();
  const idx = appts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  appts[idx] = { ...appts[idx], ...data, updatedAt: new Date().toISOString() };
  saveAppointments(appts);
  if (["ملغي", "تم الحضور", "مكتمل"].includes(appts[idx].status)) {
    cancelReminders(id);
  } else {
    regenerateReminders(appts[idx]);
  }
  return appts[idx];
}
export function deleteAppointment(id: string) {
  saveAppointments(getAppointments().filter((a) => a.id !== id));
  writeList(STORAGE_KEYS.reminders, readList<Reminder>(STORAGE_KEYS.reminders).filter((r) => r.appointmentId !== id));
}

// ---- Reminders ----
export function appointmentDateTime(a: Appointment): Date {
  const [h, m] = a.startTime.split(":").map(Number);
  const d = new Date(a.date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function appointmentEndDateTime(a: Appointment): Date {
  if (!a.endTime) return appointmentDateTime(a);
  const [h, m] = a.endTime.split(":").map(Number);
  const d = new Date(a.date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function markExpiredAppointmentsAsAttended(): number {
  const now = Date.now();
  const appts = getAppointments();
  let changed = 0;
  const updated = appts.map((appt) => {
    if (appt.status === "ملغي" || appt.status === "لم يحضر" || appt.status === "تم الحضور" || appt.status === "مكتمل") return appt;
    if (appointmentEndDateTime(appt).getTime() > now) return appt;
    changed++;
    return { ...appt, status: "تم الحضور" as const, updatedAt: new Date().toISOString() };
  });
  if (changed > 0) saveAppointments(updated);
  return changed;
}

export function getReminders(): Reminder[] {
  return readList<Reminder>(STORAGE_KEYS.reminders);
}
export function saveReminders(reminders: Reminder[]) {
  writeList(STORAGE_KEYS.reminders, reminders);
}

// (Re)generate the two default reminders (24h, 1h before) for an appointment.
// Removes any not-yet-sent reminders first so edits stay in sync.
export function regenerateReminders(appt: Appointment) {
  let reminders = getReminders().filter((r) => !(r.appointmentId === appt.id && !r.sent));
  if (["ملغي", "تم الحضور", "مكتمل"].includes(appt.status)) {
    saveReminders(reminders);
    return;
  }
  const dt = appointmentDateTime(appt);
  const candidates: { type: "24h" | "1h"; scheduledAt: Date }[] = [
    { type: "24h", scheduledAt: new Date(dt.getTime() - 24 * 60 * 60 * 1000) },
    { type: "1h", scheduledAt: new Date(dt.getTime() - 60 * 60 * 1000) },
  ];
  const future = candidates.filter((c) => c.scheduledAt.getTime() > Date.now());
  const newReminders: Reminder[] = future.map((c) => ({
    id: genId(),
    appointmentId: appt.id,
    type: c.type,
    scheduledAt: c.scheduledAt.toISOString(),
    sent: false,
  }));
  saveReminders([...reminders, ...newReminders]);
}

export function cancelReminders(appointmentId: string) {
  saveReminders(getReminders().filter((r) => !(r.appointmentId === appointmentId && !r.sent)));
}
