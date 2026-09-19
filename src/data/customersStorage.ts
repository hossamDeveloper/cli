import { Customer, CustomerType, CustomerNote } from "../types";
import { readList, writeList, STORAGE_KEYS } from "./storage";
import { genId } from "../utils/id";

// ---- Customers ----
export function getCustomers(): Customer[] {
  return readList<Customer>(STORAGE_KEYS.customers);
}
export function saveCustomers(customers: Customer[]) {
  writeList(STORAGE_KEYS.customers, customers);
}
export function addCustomer(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Customer {
  const now = new Date().toISOString();
  const customer: Customer = { ...data, id: genId(), createdAt: now, updatedAt: now };
  saveCustomers([customer, ...getCustomers()]);
  return customer;
}
export function updateCustomer(id: string, data: Partial<Customer>): Customer | null {
  const customers = getCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  customers[idx] = { ...customers[idx], ...data, updatedAt: new Date().toISOString() };
  saveCustomers(customers);
  return customers[idx];
}
export function deleteCustomer(id: string) {
  saveCustomers(getCustomers().filter((c) => c.id !== id));
  // cascade: remove notes + appointments + their reminders
  writeList(STORAGE_KEYS.customerNotes, readList<CustomerNote>(STORAGE_KEYS.customerNotes).filter((n) => n.customerId !== id));
}
export function findCustomerByPhone(phone: string): Customer | undefined {
  return getCustomers().find((c) => c.phone === phone);
}

// ---- Customer Types ----
export function getCustomerTypes(): CustomerType[] {
  return readList<CustomerType>(STORAGE_KEYS.customerTypes);
}
export function saveCustomerTypes(types: CustomerType[]) {
  writeList(STORAGE_KEYS.customerTypes, types);
}
export function addCustomerType(name: string, color?: string): CustomerType {
  const type: CustomerType = { id: genId(), name, color };
  saveCustomerTypes([...getCustomerTypes(), type]);
  return type;
}
export function updateCustomerType(id: string, name: string) {
  saveCustomerTypes(getCustomerTypes().map((t) => (t.id === id ? { ...t, name } : t)));
}
export function deleteCustomerType(id: string) {
  saveCustomerTypes(getCustomerTypes().filter((t) => t.id !== id));
}
export function seedDefaultCustomerTypes() {
  if (getCustomerTypes().length > 0) return;
  const defaults = ["عميل جديد", "عميل حالي", "VIP", "شركة", "عميل محتمل", "مورد"];
  saveCustomerTypes(defaults.map((name) => ({ id: genId(), name })));
}

// ---- Customer Notes ----
export function getCustomerNotes(customerId: string): CustomerNote[] {
  return readList<CustomerNote>(STORAGE_KEYS.customerNotes)
    .filter((n) => n.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function addCustomerNote(customerId: string, text: string): CustomerNote {
  const now = new Date().toISOString();
  const note: CustomerNote = { id: genId(), customerId, text, createdAt: now, updatedAt: now };
  writeList(STORAGE_KEYS.customerNotes, [...readList<CustomerNote>(STORAGE_KEYS.customerNotes), note]);
  return note;
}
export function updateCustomerNote(id: string, text: string) {
  const notes = readList<CustomerNote>(STORAGE_KEYS.customerNotes);
  writeList(
    STORAGE_KEYS.customerNotes,
    notes.map((n) => (n.id === id ? { ...n, text, updatedAt: new Date().toISOString() } : n))
  );
}
export function deleteCustomerNote(id: string) {
  writeList(STORAGE_KEYS.customerNotes, readList<CustomerNote>(STORAGE_KEYS.customerNotes).filter((n) => n.id !== id));
}
