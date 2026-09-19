import { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";

export function Modal({
  open, onClose, title, children, size = "md",
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} surface rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`} dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg surface-hover"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = "حذف", danger = true,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; danger?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm surface rounded-2xl shadow-2xl p-5" dir="rtl">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm surface-hover border" style={{ borderColor: "var(--border)" }}>إلغاء</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg text-sm text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Extra-cautious confirm: user must type DELETE before the destructive action fires.
export function TypedConfirmDialog({
  open, onClose, onConfirm, title, message, confirmWord = "DELETE",
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmWord?: string }) {
  const [value, setValue] = useState("");
  useEffect(() => { if (open) setValue(""); }, [open]);
  if (!open) return null;
  const match = value.trim() === confirmWord;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm surface rounded-2xl shadow-2xl p-5" dir="rtl">
        <h3 className="font-bold text-lg mb-2 text-red-600">{title}</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{message}</p>
        <p className="text-sm mb-2">
          اكتب <span className="font-mono font-bold">{confirmWord}</span> للتأكيد:
        </p>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-red-500"
          style={{ borderColor: "var(--border)" }}
          dir="ltr"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm surface-hover border" style={{ borderColor: "var(--border)" }}>إلغاء</button>
          <button
            disabled={!match}
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 rounded-lg text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            حذف جميع البيانات
          </button>
        </div>
      </div>
    </div>
  );
}
