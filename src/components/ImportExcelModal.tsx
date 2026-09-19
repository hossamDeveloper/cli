import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button, Spinner } from "./ui";
import { PreviewRow } from "../utils/excel";

export function ImportExcelModal<T>({
  open, onClose, onPreview, onCommit, displayName,
}: {
  open: boolean;
  onClose: () => void;
  onPreview: (file: File) => Promise<PreviewRow<T>[]>;
  onCommit: (rows: PreviewRow<T>[]) => { imported: number; skipped: number };
  displayName: (row: T) => string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PreviewRow<T>[] | null>(null);

  function reset() {
    setRows(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const result = await onPreview(file);
      setRows(result);
    } catch {
      toast.error("تعذر قراءة الملف، تأكد أنه ملف Excel صالح");
    } finally {
      setLoading(false);
    }
  }

  function commit() {
    if (!rows) return;
    const importable = rows.filter((r) => r.valid && !r.duplicate);
    if (importable.length === 0) {
      toast.error("لا يوجد صفوف صالحة للاستيراد");
      return;
    }
    const result = onCommit(importable);
    toast.success(`تم استيراد ${result.imported} صف بنجاح`);
    if (result.skipped) toast.warning(`تم تجاوز ${result.skipped} صف`);
    reset();
    onClose();
  }

  const validCount = rows?.filter((r) => r.valid && !r.duplicate).length ?? 0;
  const errorCount = rows?.filter((r) => !r.valid || r.duplicate).length ?? 0;

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="استيراد من Excel" size="lg">
      {!rows && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          {loading ? (
            <Spinner size={32} />
          ) : (
            <>
              <Upload size={36} className="text-brand-600" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>اختر ملف Excel (.xlsx) لاستيراد البيانات</p>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>اختيار ملف</Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </>
          )}
        </div>
      )}

      {rows && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <StatPill icon={<CheckCircle2 size={14} />} label="صفوف صالحة" value={validCount} color="text-green-600" />
            <StatPill icon={<XCircle size={14} />} label="صفوف بها أخطاء" value={errorCount} color="text-red-600" />
            <StatPill icon={<AlertTriangle size={14} />} label="إجمالي الصفوف" value={rows.length} color="text-gray-500" />
          </div>
          <div className="max-h-80 overflow-y-auto border rounded-xl" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead className="surface-hover sticky top-0">
                <tr><th className="p-2 text-right">الصف</th><th className="p-2 text-right">البيانات</th><th className="p-2 text-right">الحالة</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="p-2 align-top">{r.row}</td>
                    <td className="p-2 align-top">{r.data ? displayName(r.data) : "—"}</td>
                    <td className="p-2 align-top">
                      {r.valid && !r.duplicate ? (
                        <span className="text-green-600 text-xs">{r.existing ? "سيتم تحديث العميل" : "صالح للاستيراد"}</span>
                      ) : (
                        <ul className="text-red-500 text-xs space-y-0.5">{r.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={reset}>اختيار ملف آخر</Button>
            <Button onClick={commit} disabled={validCount === 0}>استيراد ({validCount})</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-sm ${color}`}>
      {icon}<span className="font-bold">{value}</span><span style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
