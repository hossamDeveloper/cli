import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react";
import clsx from "clsx";

const fieldBase =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition";

export function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(function Input(props, ref) {
  const { error, className, ...rest } = props;
  return (
    <input
      {...rest}
      ref={ref}
      className={clsx(fieldBase, error ? "border-red-500" : "", className)}
      style={{ borderColor: error ? undefined : "var(--border)" }}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(props, ref) {
  const { className, ...rest } = props;
  return <textarea {...rest} ref={ref} className={clsx(fieldBase, className)} style={{ borderColor: "var(--border)" }} rows={rest.rows || 3} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} ref={ref} className={clsx(fieldBase, className)} style={{ borderColor: "var(--border)" }}>
      {children}
    </select>
  );
});

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const { variant = "primary", className, ...rest } = props;
  const styles = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white",
    secondary: "surface surface-hover border",
    ghost: "surface-hover",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };
  return (
    <button
      {...rest}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      style={variant === "secondary" ? { borderColor: "var(--border)" } : undefined}
    />
  );
}

const STATUS_COLORS: Record<string, string> = {
  "جديد": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "نشط": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "متابعة": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "مكتمل": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "غير نشط": "bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300",
  "قادم": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "مؤكد": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "تم الحضور": "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "ملغي": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "لم يحضر": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "مؤجل": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", STATUS_COLORS[status] || "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size, color: "var(--text-muted)" }}
    />
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}
