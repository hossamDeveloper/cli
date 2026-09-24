import * as XLSX from "xlsx";
import { Customer, CustomerType, Appointment, CustomerNote } from "../types";
import { genId } from "./id";
import { readList, STORAGE_KEYS } from "../data/storage";

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        resolve(XLSX.read(data, { type: "array" }));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
}

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): any[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function normalizeCustomerTypeName(name: string) {
  return name.replace(/[\u064B-\u065F\u0670]/g, "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").replace(/\s+/g, " ").trim().toLowerCase();
}

export interface PreviewRow<T> {
  row: number;
  valid: boolean;
  duplicate: boolean;
  existing?: boolean;
  errors: string[];
  data: T | null;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
const CUSTOMER_COLUMNS = [
  "ID", "الاسم", "الهاتف", "WhatsApp", "Email", "نوع العميل", "الشركة", "الوظيفة",
  "العنوان", "المدينة", "مصدر العميل", "المسؤول", "الحالة", "الملاحظات", "تاريخ الإضافة",
];

export function exportCustomersToExcel(customers: Customer[], types: CustomerType[]) {
  const typeName = (id?: string) => types.find((t) => t.id === id)?.name || "";
  const allNotes = readList<CustomerNote>(STORAGE_KEYS.customerNotes);
  const notesByCustomer = new Map<string, CustomerNote[]>();
  allNotes.forEach((note) => {
    notesByCustomer.set(note.customerId, [...(notesByCustomer.get(note.customerId) || []), note]);
  });
  const rows = customers.map((c) => ({
    "ID": c.id, "الاسم": c.name, "الهاتف": c.phone, "WhatsApp": c.whatsapp || "",
    "Email": c.email || "", "نوع العميل": typeName(c.customerTypeId), "الشركة": c.company || "",
    "الوظيفة": c.jobTitle || "", "العنوان": c.address || "", "المدينة": c.city || "",
    "مصدر العميل": c.source || "", "المسؤول": c.assignedTo || "", "الحالة": c.status,
    "الملاحظات": [c.notes, ...(notesByCustomer.get(c.id) || []).map((note) => note.text)].filter(Boolean).join("\n"),
    "تاريخ الإضافة": c.createdAt.slice(0, 10),
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: CUSTOMER_COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "العملاء");
  const notes = customers.flatMap((customer) =>
    (notesByCustomer.get(customer.id) || []).map((note) => ({
      "Customer ID": customer.id,
      "الهاتف": customer.phone,
      "اسم العميل": customer.name,
      "الملاحظة": note.text,
      "تاريخ الإنشاء": note.createdAt,
      "تاريخ التعديل": note.updatedAt,
    }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notes), "ملاحظات");
  downloadWorkbook(wb, "customers.xlsx");
}

export async function previewCustomersImport(
  file: File,
  existingCustomers: Customer[],
  types: CustomerType[]
): Promise<PreviewRow<Omit<Customer, "id" | "createdAt" | "updatedAt">>[]> {
  const wb = await readWorkbookFromFile(file);
  const rows = sheetToRows(wb, wb.SheetNames[0]);
  const noteRows = sheetToRows(wb, wb.SheetNames.find((name) => name === "ملاحظات") || "");
  const typeByName = new Map(types.map((t) => [normalizeCustomerTypeName(t.name), t.id]));
  const existingPhones = new Set(existingCustomers.map((c) => c.phone));
  const seen = new Set<string>();
  const notesByPhone = new Map<string, CustomerNote[]>();
  noteRows.forEach((row) => {
    const phone = String(row["الهاتف"] || "").trim();
    const text = String(row["الملاحظة"] || "").trim();
    if (!phone || !text) return;
    const note: CustomerNote = {
      id: String(row["ID"] || genId()),
      customerId: String(row["Customer ID"] || ""),
      text,
      createdAt: String(row["تاريخ الإنشاء"] || new Date().toISOString()),
      updatedAt: String(row["تاريخ التعديل"] || row["تاريخ الإنشاء"] || new Date().toISOString()),
    };
    notesByPhone.set(phone, [...(notesByPhone.get(phone) || []), note]);
  });

  return rows.map((row, idx) => {
    const errors: string[] = [];
    const name = String(row["الاسم"] || "").trim();
    const phone = String(row["الهاتف"] || "").trim();
    const typeNameVal = String(row["نوع العميل"] || "").trim();
    const normalizedTypeName = normalizeCustomerTypeName(typeNameVal);

    if (!name) errors.push("الاسم مطلوب");
    if (!phone) errors.push("رقم الهاتف مطلوب");
    const existing = phone ? existingPhones.has(phone) : false;
    let duplicate = false;
    if (phone && seen.has(phone)) {
      duplicate = true;
      errors.push("العميل موجود بالفعل");
    }
    if (phone) seen.add(phone);

    return {
      row: idx + 2,
      valid: errors.length === 0,
      duplicate,
      existing,
      errors,
      data: {
        name, phone,
        whatsapp: String(row["WhatsApp"] || "").trim() || undefined,
        email: String(row["Email"] || "").trim() || undefined,
        // Keep unknown type names temporarily; the commit step creates them.
        customerTypeId: typeNameVal ? typeByName.get(normalizedTypeName) || typeNameVal : undefined,
        company: String(row["الشركة"] || "").trim() || undefined,
        jobTitle: String(row["الوظيفة"] || "").trim() || undefined,
        address: String(row["العنوان"] || "").trim() || undefined,
        city: String(row["المدينة"] || "").trim() || undefined,
        source: String(row["مصدر العميل"] || "").trim() || undefined,
        assignedTo: String(row["المسؤول"] || "").trim() || undefined,
        status: (String(row["الحالة"] || "جديد").trim() || "جديد") as Customer["status"],
        notes: String(row["الملاحظات"] || "").trim() || undefined,
        importedNotes: notesByPhone.get(phone) || [],
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
const APPT_COLUMNS = [
  "ID", "Customer ID", "اسم العميل", "الهاتف", "نوع الموعد", "التاريخ", "وقت البداية",
  "وقت النهاية", "المسؤول", "المكان", "الحالة", "الملاحظات",
];

export function exportAppointmentsToExcel(appointments: Appointment[], customers: Customer[]) {
  const custById = new Map(customers.map((c) => [c.id, c]));
  const rows = appointments.map((a) => {
    const c = custById.get(a.customerId);
    return {
      "ID": a.id, "Customer ID": a.customerId, "اسم العميل": c?.name || "", "الهاتف": c?.phone || "",
      "نوع الموعد": a.type || "", "التاريخ": a.date, "وقت البداية": a.startTime, "وقت النهاية": a.endTime || "",
      "المسؤول": a.assignedTo || "", "المكان": a.location || "", "الحالة": a.status, "الملاحظات": a.notes || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows, { header: APPT_COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المواعيد");
  downloadWorkbook(wb, "appointments.xlsx");
}

export async function previewAppointmentsImport(
  file: File,
  existingAppointments: Appointment[],
  customers: Customer[]
): Promise<PreviewRow<Omit<Appointment, "id" | "createdAt" | "updatedAt"> & { customerName: string }>[]> {
  const wb = await readWorkbookFromFile(file);
  const rows = sheetToRows(wb, wb.SheetNames[0]);
  const byPhone = new Map(customers.map((c) => [c.phone, c]));
  const byName = new Map(customers.map((c) => [c.name.trim(), c]));
  const existingKeys = new Set(existingAppointments.map((a) => `${a.customerId}|${a.date}|${a.startTime}`));
  const seen = new Set<string>();

  return rows.map((row, idx) => {
    const errors: string[] = [];
    const customerName = String(row["اسم العميل"] || "").trim();
    const phone = String(row["الهاتف"] || "").trim();
    const date = String(row["التاريخ"] || "").trim();
    const startTime = String(row["وقت البداية"] || "").trim();

    const customer = (phone && byPhone.get(phone)) || (customerName && byName.get(customerName));
    if (!customer) errors.push(`العميل ${customerName || phone || "غير معروف"} غير موجود`);
    if (!date) errors.push("التاريخ مطلوب");
    if (!startTime) errors.push("وقت البداية مطلوب");

    let duplicate = false;
    if (customer && date && startTime) {
      const key = `${customer.id}|${date}|${startTime}`;
      if (existingKeys.has(key) || seen.has(key)) {
        duplicate = true;
        errors.push("هذا الموعد موجود بالفعل");
      }
      seen.add(key);
    }

    return {
      row: idx + 2,
      valid: errors.length === 0,
      duplicate,
      errors,
      data: customer
        ? {
            customerId: customer.id,
            customerName: customer.name,
            type: String(row["نوع الموعد"] || "").trim() || undefined,
            date, startTime,
            endTime: String(row["وقت النهاية"] || "").trim() || undefined,
            assignedTo: String(row["المسؤول"] || "").trim() || undefined,
            location: String(row["المكان"] || "").trim() || undefined,
            status: (String(row["الحالة"] || "قادم").trim() || "قادم") as Appointment["status"],
            notes: String(row["الملاحظات"] || "").trim() || undefined,
          }
        : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Full backup (multi-sheet): Customers, CustomerTypes, Appointments, Notes
// ---------------------------------------------------------------------------
export function exportFullBackup(
  customers: Customer[],
  types: CustomerType[],
  appointments: Appointment[],
  notes: CustomerNote[]
) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), "Customers");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(types), "CustomerTypes");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appointments), "Appointments");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notes), "Notes");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `CRM_Backup_${dateStr}.xlsx`);
}

export interface FullBackupData {
  customers: Customer[];
  customerTypes: CustomerType[];
  appointments: Appointment[];
  notes: CustomerNote[];
}

export async function readFullBackup(file: File): Promise<FullBackupData> {
  const wb = await readWorkbookFromFile(file);
  return {
    customers: sheetToRows(wb, "Customers") as Customer[],
    customerTypes: sheetToRows(wb, "CustomerTypes") as CustomerType[],
    appointments: sheetToRows(wb, "Appointments") as Appointment[],
    notes: sheetToRows(wb, "Notes") as CustomerNote[],
  };
}

// Merge strategy: skip duplicate customers (by phone) and duplicate appointments
// (by customerId+date+startTime); keep everything already in the browser.
export function mergeBackupData(current: FullBackupData, incoming: FullBackupData): FullBackupData {
  const existingPhones = new Set(current.customers.map((c) => c.phone));
  const newCustomers = incoming.customers.filter((c) => c.phone && !existingPhones.has(c.phone));

  const existingTypeNames = new Set(current.customerTypes.map((t) => t.name));
  const newTypes = incoming.customerTypes.filter((t) => !existingTypeNames.has(t.name));

  const existingApptKeys = new Set(current.appointments.map((a) => `${a.customerId}|${a.date}|${a.startTime}`));
  const newAppts = incoming.appointments.filter((a) => !existingApptKeys.has(`${a.customerId}|${a.date}|${a.startTime}`));

  const existingNoteIds = new Set(current.notes.map((n) => n.id));
  const newNotes = incoming.notes.filter((n) => !existingNoteIds.has(n.id));

  return {
    customers: [...current.customers, ...newCustomers],
    customerTypes: [...current.customerTypes, ...newTypes],
    appointments: [...current.appointments, ...newAppts],
    notes: [...current.notes, ...newNotes],
  };
}

export function ensureIds<T extends { id?: string }>(items: T[]): (T & { id: string })[] {
  return items.map((item) => ({ ...item, id: item.id || genId() }));
}
