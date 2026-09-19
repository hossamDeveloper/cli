import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Trash2, ShieldAlert } from "lucide-react";
import { Modal, TypedConfirmDialog } from "./Modal";
import { Button } from "./ui";
import { getCustomers, saveCustomers, getCustomerTypes, saveCustomerTypes } from "../data/customersStorage";
import { getAppointments, saveAppointments } from "../data/appointmentsStorage";
import { readList, writeList, STORAGE_KEYS, clearAllData } from "../data/storage";
import { CustomerNote } from "../types";
import { exportFullBackup, readFullBackup, mergeBackupData, ensureIds, FullBackupData } from "../utils/excel";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<FullBackupData | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  function currentData(): FullBackupData {
    return {
      customers: getCustomers(),
      customerTypes: getCustomerTypes(),
      appointments: getAppointments(),
      notes: readList<CustomerNote>(STORAGE_KEYS.customerNotes),
    };
  }

  function exportBackup() {
    const d = currentData();
    exportFullBackup(d.customers, d.customerTypes, d.appointments, d.notes);
    toast.success("تم تنزيل النسخة الاحتياطية");
  }

  async function handleFile(file: File) {
    try {
      const data = await readFullBackup(file);
      setIncoming(data);
    } catch {
      toast.error("تعذر قراءة ملف النسخة الاحتياطية");
    }
  }

  function applyRestore(mode: "replace" | "merge") {
    if (!incoming) return;
    const data =
      mode === "replace"
        ? incoming
        : mergeBackupData(currentData(), incoming);

    saveCustomers(ensureIds(data.customers));
    saveCustomerTypes(ensureIds(data.customerTypes));
    saveAppointments(ensureIds(data.appointments));
    writeList(STORAGE_KEYS.customerNotes, ensureIds(data.notes));

    toast.success(mode === "replace" ? "تم استبدال البيانات بنجاح" : "تم دمج البيانات بنجاح");
    setIncoming(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
    location.reload(); // ensure every open view reflects the restored data
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="الإعدادات والنسخ الاحتياطي" size="md">
        <div className="flex items-start gap-2 text-xs p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 mb-5">
          <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
          <p>بياناتك محفوظة محليًا داخل هذا المتصفح والجهاز فقط (LocalStorage). حذف بيانات الموقع أو تغيير المتصفح/الجهاز قد يؤدي لفقدان البيانات. استخدم النسخ الاحتياطي بشكل دوري.</p>
        </div>

        {!incoming ? (
          <div className="space-y-3">
            <div className="border rounded-xl p-4" style={{ borderColor: "var(--border)" }}>
              <h4 className="font-bold text-sm mb-1">نسخة احتياطية كاملة (Excel)</h4>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>يتم تصدير كل البيانات (العملاء، الأنواع، المواعيد، الملاحظات) في ملف Excel واحد متعدد الصفحات.</p>
              <div className="flex gap-2">
                <Button onClick={exportBackup}><Download size={14} /> تصدير نسخة احتياطية</Button>
                <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={14} /> استيراد / استعادة</Button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </div>

            <div className="border border-red-200 dark:border-red-900/40 rounded-xl p-4">
              <h4 className="font-bold text-sm mb-1 text-red-600">منطقة الخطر</h4>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>سيتم حذف جميع العملاء والمواعيد والملاحظات من هذا المتصفح نهائيًا.</p>
              <Button variant="danger" onClick={() => setClearOpen(true)}><Trash2 size={14} /> مسح جميع البيانات</Button>
            </div>
          </div>
        ) : (
          <div>
            <h4 className="font-bold text-sm mb-3">ملخص النسخة الاحتياطية قبل الاستعادة</h4>
            <div className="grid grid-cols-2 gap-2 mb-5 text-sm">
              <SummaryRow label="العملاء" value={incoming.customers.length} />
              <SummaryRow label="أنواع العملاء" value={incoming.customerTypes.length} />
              <SummaryRow label="المواعيد" value={incoming.appointments.length} />
              <SummaryRow label="الملاحظات" value={incoming.notes.length} />
            </div>
            <p className="text-sm mb-3">اختر طريقة الاستعادة:</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => applyRestore("merge")}>دمج مع البيانات الحالية (Merge)</Button>
              <Button variant="secondary" onClick={() => applyRestore("replace")}>استبدال البيانات الحالية بالكامل (Replace)</Button>
              <Button variant="ghost" onClick={() => setIncoming(null)}>إلغاء</Button>
            </div>
          </div>
        )}
      </Modal>

      <TypedConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={() => { clearAllData(); toast.success("تم حذف جميع البيانات"); onClose(); location.reload(); }}
        title="تحذير: مسح جميع البيانات"
        message="سيتم حذف جميع العملاء والمواعيد والملاحظات من هذا المتصفح نهائيًا. هذا الإجراء لا يمكن التراجع عنه."
      />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border rounded-lg px-3 py-2" style={{ borderColor: "var(--border)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
