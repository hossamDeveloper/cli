import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download, Upload, Search, Settings, Pencil, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { Customer, CUSTOMER_STATUSES } from "../types";
import { getCustomers, deleteCustomer, getCustomerTypes, addCustomer, updateCustomer, findCustomerByPhone } from "../data/customersStorage";
import { readList, writeList, STORAGE_KEYS } from "../data/storage";
import { CustomerNote } from "../types";
import { getAppointmentsForCustomer } from "../data/appointmentsStorage";
import { Button, Select, Input, StatusBadge, EmptyState } from "../components/ui";
import { ConfirmDialog } from "../components/Modal";
import { CustomerFormModal } from "../components/CustomerFormModal";
import { CustomerDetailsModal } from "../components/CustomerDetailsModal";
import { CustomerTypesModal } from "../components/CustomerTypesModal";
import { ImportExcelModal } from "../components/ImportExcelModal";
import { exportCustomersToExcel, previewCustomersImport } from "../utils/excel";

const PAGE_SIZE = 15;

export default function CustomersPage() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const types = getCustomerTypes();
  const allCustomers = getCustomers();
  const owners = useMemo(() => Array.from(new Set(allCustomers.map((c) => c.assignedTo).filter(Boolean))) as string[], [allCustomers]);

  const filtered = useMemo(() => {
    let list = allCustomers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || "").toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q));
    }
    if (typeFilter) list = list.filter((c) => c.customerTypeId === typeFilter);
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (ownerFilter) list = list.filter((c) => c.assignedTo === ownerFilter);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allCustomers, search, typeFilter, statusFilter, ownerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleDelete(id: string) {
    deleteCustomer(id);
    toast.success("تم حذف العميل");
    refresh();
  }

  function exportExcel() {
    exportCustomersToExcel(allCustomers, types);
  }

  function nextAppointment(customerId: string) {
    const today = new Date().toISOString().slice(0, 10);
    return getAppointmentsForCustomer(customerId)
      .filter((a) => a.date >= today && !["ملغي", "مكتمل"].includes(a.status))
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  }
  function lastAppointment(customerId: string) {
    return getAppointmentsForCustomer(customerId)[0];
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-extrabold">العملاء</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setEditingCustomer(null); setFormOpen(true); }}><Plus size={16} /> إضافة عميل</Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={16} /> استيراد Excel</Button>
          <Button variant="secondary" onClick={exportExcel}><Download size={16} /> تصدير Excel</Button>
        </div>
      </div>

      <div className="surface rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <Input placeholder="ابحث بالاسم، الهاتف، البريد، الشركة..." className="pr-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="w-auto">
          <option value="">كل الأنواع</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-auto">
          <option value="">كل الحالات</option>
          {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }} className="w-auto">
          <option value="">كل المسؤولين</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
        <button onClick={() => setTypesModalOpen(true)} className="p-2 rounded-lg surface-hover border" style={{ borderColor: "var(--border)" }} title="إدارة أنواع العملاء">
          <Settings size={16} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="surface rounded-xl"><EmptyState title="لا يوجد عملاء" hint="ابدأ بإضافة عميل جديد أو غيّر الفلاتر" /></div>
      ) : (
        <>
          <div className="surface rounded-xl overflow-x-auto hidden md:block">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="surface-hover">
                <tr className="text-right">
                  {["الاسم", "الهاتف", "WhatsApp", "البريد", "النوع", "الشركة", "المسؤول", "الحالة", "آخر موعد", "الموعد القادم", "تاريخ الإضافة", "الإجراءات"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => {
                  const next = nextAppointment(c.id);
                  const last = lastAppointment(c.id);
                  const type = types.find((t) => t.id === c.customerTypeId);
                  return (
                    <tr key={c.id} className="border-t surface-hover cursor-pointer" style={{ borderColor: "var(--border)" }} onClick={() => setDetailsCustomer(c)}>
                      <td className="p-3 font-medium text-brand-600">{c.name}</td>
                      <td className="p-3" dir="ltr">{c.phone}</td>
                      <td className="p-3" dir="ltr">{c.whatsapp || "—"}</td>
                      <td className="p-3">{c.email || "—"}</td>
                      <td className="p-3">{type?.name || "—"}</td>
                      <td className="p-3">{c.company || "—"}</td>
                      <td className="p-3">{c.assignedTo || "—"}</td>
                      <td className="p-3"><StatusBadge status={c.status} /></td>
                      <td className="p-3">{last ? last.date : "—"}</td>
                      <td className="p-3">{next ? next.date : "—"}</td>
                      <td className="p-3">{format(new Date(c.createdAt), "yyyy-MM-dd")}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingCustomer(c); setFormOpen(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Pencil size={14} /></button>
                          <button onClick={() => setToDelete({ id: c.id, name: c.name })} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {pageItems.map((c) => {
              const type = types.find((t) => t.id === c.customerTypeId);
              return (
                <div key={c.id} className="surface rounded-xl p-4" onClick={() => setDetailsCustomer(c)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-brand-600">{c.name}</p>
                      <p className="text-sm" dir="ltr" style={{ color: "var(--text-muted)" }}>{c.phone}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex justify-between items-center mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{type?.name || "—"}</span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setEditingCustomer(c); setFormOpen(true); }} className="p-1.5 surface-hover rounded"><Pencil size={14} /></button>
                      <button onClick={() => setToDelete({ id: c.id, name: c.name })} className="p-1.5 text-red-500 surface-hover rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg surface-hover border disabled:opacity-40" style={{ borderColor: "var(--border)" }}><ChevronRight size={16} /></button>
              <span className="text-sm">{page} من {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg surface-hover border disabled:opacity-40" style={{ borderColor: "var(--border)" }}><ChevronLeft size={16} /></button>
            </div>
          )}
        </>
      )}

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} customer={editingCustomer} customerTypes={types} />
      <CustomerDetailsModal
        open={!!detailsCustomer}
        onClose={() => setDetailsCustomer(null)}
        customer={detailsCustomer}
        customerTypes={types}
        onEdit={(c) => { setDetailsCustomer(null); setEditingCustomer(c); setFormOpen(true); }}
        onChanged={refresh}
      />
      <CustomerTypesModal open={typesModalOpen} onClose={() => setTypesModalOpen(false)} types={types} onChanged={refresh} />
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onPreview={(file) => previewCustomersImport(file, getCustomers(), getCustomerTypes())}
        onCommit={(rows) => {
          let imported = 0;
          rows.forEach((r) => {
            if (!r.data) return;
            const existing = findCustomerByPhone(r.data.phone);
            const { importedNotes, ...customerData } = r.data as any;
            const savedCustomer = existing ? updateCustomer(existing.id, customerData) : addCustomer(customerData);
            if (savedCustomer && importedNotes?.length) {
              const allNotes = readList<CustomerNote>(STORAGE_KEYS.customerNotes);
              const otherNotes = allNotes.filter((note) => note.customerId !== savedCustomer.id);
              const restoredNotes = importedNotes.map((note: CustomerNote) => ({ ...note, customerId: savedCustomer.id }));
              writeList(STORAGE_KEYS.customerNotes, [...otherNotes, ...restoredNotes]);
            }
            imported++;
          });
          refresh();
          return { imported, skipped: 0 };
        }}
        displayName={(d: any) => `${d.name} — ${d.phone}`}
      />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && handleDelete(toDelete.id)} title="حذف العميل" message={`هل أنت متأكد من حذف "${toDelete?.name}"؟ سيتم حذف كل ملاحظاته.`} />
    </div>
  );
}
