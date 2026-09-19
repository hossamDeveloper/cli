export const CUSTOMER_STATUSES = ["جديد", "نشط", "متابعة", "مكتمل", "غير نشط"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const APPOINTMENT_STATUSES = ["قادم", "مؤكد", "مكتمل", "ملغي", "لم يحضر", "مؤجل"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  customerTypeId?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  city?: string;
  source?: string;
  assignedTo?: string;
  status: CustomerStatus;
  notes?: string; // general free-text note
  createdAt: string;
  updatedAt: string;
}

export interface CustomerType {
  id: string;
  name: string;
  color?: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  type?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  assignedTo?: string;
  location?: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  appointmentId: string;
  type: "24h" | "1h";
  scheduledAt: string;
  sent: boolean;
}

export interface AppNotification {
  id: string;
  type: "reminder" | "updated" | "cancelled" | "info";
  appointmentId?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Settings {
  privacyNoticeDismissed?: boolean;
  theme?: "light" | "dark";
}
