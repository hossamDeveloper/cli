import { useState } from "react";
import { Pencil, Trash2, Plus, Phone, Mail, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Customer, CustomerType } from "../types";
import { getCustomerNotes, addCustomerNote, updateCustomerNote, deleteCustomerNote } from "../data/customersStorage";
import { getAppointmentsForCustomer } from "../data/appointmentsStorage";
import { Modal, ConfirmDialog } from "./Modal";
import { Button, StatusBadge, Textarea } from "./ui";
import { AppointmentFormModal } from "./AppointmentFormModal";

export function CustomerDetailsModal({
  open, onClose, customer, customerTypes, onEdit, onChanged,
}: { open: boolean; onClose: () => void; customer: Customer | null; customerTypes: CustomerType[]; onEdit: (c: Customer) => void; onChanged: () => void }) {
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [, forceRender] = useState(0);

  if (!customer) return null;
  const type = customerTypes.find((t) => t.id === customer.customerTypeId);
  const notes = getCustomerNotes(customer.id);
  const appointments = getAppointmentsForCustomer(customer.id);

  function refresh() {
    forceRender((n) => n + 1);
    onChanged();
  }

  function addNote() {
    if (!noteText.trim()) return;
    addCustomerNote(customer!.id, noteText.trim());
    setNoteText("");
    refresh();
  }
  function saveNoteEdit(id: string) {
    if (!editingNoteText.trim()) return;
    updateCustomerNote(id, editingNoteText.trim());
    setEditingNoteId(null);
    refresh();
  }
  function removeNote(id: string) {
    deleteCustomerNote(id);
    refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="تفاصيل العميل" size="lg">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">{customer.name}</h3>
            <div className="flex flex-wrap gap-3 mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>
              {customer.email && <span className="flex items-center gap-1"><Mail size={14} /> {customer.email}</span>}
              {customer.company && <span className="flex items-center gap-1"><Building2 size={14} /> {customer.company}</span>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={customer.status} />
              {type && <span className="text-xs px-2 py-0.5 rounded-full surface-hover border" style={{ borderColor: "var(--border)" }}>{type.name}</span>}
              {customer.assignedTo && <span className="text-xs" style={{ color: "var(--text-muted)" }}>المسؤول: {customer.assignedTo}</span>}
            </div>
          </div>
          <Button variant="secondary" onClick={() => onEdit(customer)}><Pencil size={14} /> تعديل</Button>
        </div>

        <div>
          <h4 className="font-bold text-sm mb-2">الملاحظات</h4>
          <div className="flex gap-2 mb-3">
            <Textarea placeholder="أضف ملاحظة جديدة..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} />
            <Button onClick={addNote} className="self-end"><Plus size={14} /></Button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {notes.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>لا توجد ملاحظات بعد</p>}
            {notes.map((n) => (
              <div key={n.id} className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
                {editingNoteId === n.id ? (
                  <div className="space-y-2">
                    <Textarea value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} rows={2} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" onClick={() => setEditingNoteId(null)}>إلغاء</Button>
                      <Button onClick={() => saveNoteEdit(n.id)}>حفظ</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{n.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(n.createdAt), "yyyy-MM-dd HH:mm")}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.text); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Pencil size={13} /></button>
                        <button onClick={() => setNoteToDelete(n.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm">مواعيد العميل</h4>
            <Button variant="secondary" onClick={() => setApptModalOpen(true)}><Plus size={14} /> إضافة موعد</Button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {appointments.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>لا توجد مواعيد بعد</p>}
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between border rounded-lg p-2.5 text-sm" style={{ borderColor: "var(--border)" }}>
                <div>
                  <span className="font-medium">{a.date}</span>
                  <span className="mx-1" style={{ color: "var(--text-muted)" }}>{a.startTime}</span>
                  {a.type && <span className="text-xs" style={{ color: "var(--text-muted)" }}> · {a.type}</span>}
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <AppointmentFormModal open={apptModalOpen} onClose={() => setApptModalOpen(false)} onSaved={refresh} fixedCustomer={customer} />
      <ConfirmDialog open={!!noteToDelete} onClose={() => setNoteToDelete(null)} onConfirm={() => noteToDelete && removeNote(noteToDelete)} title="حذف الملاحظة" message="هل أنت متأكد من حذف هذه الملاحظة؟" />
    </Modal>
  );
}
