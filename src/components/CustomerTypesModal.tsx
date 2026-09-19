import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { CustomerType } from "../types";
import { addCustomerType, updateCustomerType, deleteCustomerType, getCustomers } from "../data/customersStorage";
import { Modal, ConfirmDialog } from "./Modal";
import { Button, Input } from "./ui";

export function CustomerTypesModal({
  open, onClose, types, onChanged,
}: { open: boolean; onClose: () => void; types: CustomerType[]; onChanged: () => void }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  function countUsage(typeId: string) {
    return getCustomers().filter((c) => c.customerTypeId === typeId).length;
  }

  function add() {
    if (!newName.trim()) return;
    if (types.some((t) => t.name === newName.trim())) {
      toast.error("هذا النوع موجود بالفعل");
      return;
    }
    addCustomerType(newName.trim());
    setNewName("");
    onChanged();
  }

  function saveEdit(id: string) {
    if (!editValue.trim()) return;
    updateCustomerType(id, editValue.trim());
    setEditingId(null);
    onChanged();
  }

  function remove(id: string) {
    if (countUsage(id) > 0) {
      toast.error("لا يمكن حذف هذا النوع لأنه مستخدم من قبل عملاء");
      return;
    }
    deleteCustomerType(id);
    onChanged();
  }

  return (
    <Modal open={open} onClose={onClose} title="إدارة أنواع العملاء" size="sm">
      <div className="flex gap-2 mb-4">
        <Input placeholder="اسم النوع الجديد" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}><Plus size={16} /> إضافة</Button>
      </div>
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {types.length === 0 && <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>لا توجد أنواع بعد</p>}
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg surface-hover border" style={{ borderColor: "var(--border)" }}>
            {editingId === t.id ? (
              <>
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 py-1" autoFocus />
                <button onClick={() => saveEdit(t.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"><X size={16} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{t.name}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{countUsage(t.id)} عميل</span>
                <button onClick={() => { setEditingId(t.id); setEditValue(t.name); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Pencil size={14} /></button>
                <button onClick={() => setToDelete({ id: t.id, name: t.name })} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && remove(toDelete.id)} title="حذف نوع العميل" message={`هل أنت متأكد من حذف "${toDelete?.name}"؟`} />
    </Modal>
  );
}
