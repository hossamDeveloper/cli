import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download, Upload, ChevronRight, ChevronLeft, LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from "date-fns";
import { ar } from "date-fns/locale";
import { Appointment, APPOINTMENT_STATUSES } from "../types";
import { getAppointments, deleteAppointment, addAppointment, getReminders } from "../data/appointmentsStorage";
import { getCustomers } from "../data/customersStorage";
import { Button, Select, StatusBadge, EmptyState } from "../components/ui";
import { ConfirmDialog } from "../components/Modal";
import { AppointmentFormModal } from "../components/AppointmentFormModal";
import { ImportExcelModal } from "../components/ImportExcelModal";
import { exportAppointmentsToExcel, previewAppointmentsImport } from "../utils/excel";

type ViewMode = "calendar" | "list";
type CalendarScale = "month" | "week" | "day";

export default function AppointmentsPage() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [scale, setScale] = useState<CalendarScale>("month");
  const [cursor, setCursor] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; label: string } | null>(null);

  const customers = getCustomers();
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const reminders = getReminders();

  const appointments = useMemo(() => {
    let list = getAppointments();
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    return list.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, [statusFilter, viewMode, cursor, tick]);

  function handleDelete(id: string) {
    deleteAppointment(id);
    toast.success("تم حذف الموعد");
    refresh();
  }

  function exportExcel() {
    exportAppointmentsToExcel(getAppointments(), customers);
  }

  function reminderSummary(apptId: string) {
    const rs = reminders.filter((r) => r.appointmentId === apptId);
    if (rs.length === 0) return "—";
    return rs.map((r) => (r.sent ? `${r.type} ✓` : `${r.type} …`)).join(" / ");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-extrabold">المواعيد</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setEditingAppt(null); setFormOpen(true); }}><Plus size={16} /> إضافة موعد</Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={16} /> استيراد Excel</Button>
          <Button variant="secondary" onClick={exportExcel}><Download size={16} /> تصدير Excel</Button>
        </div>
      </div>

      <div className="surface rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("calendar")} className={`p-2 rounded-lg border ${viewMode === "calendar" ? "bg-brand-600 text-white" : "surface-hover"}`} style={{ borderColor: "var(--border)" }}><LayoutGrid size={16} /></button>
          <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg border ${viewMode === "list" ? "bg-brand-600 text-white" : "surface-hover"}`} style={{ borderColor: "var(--border)" }}><List size={16} /></button>
          {viewMode === "calendar" && (
            <Select value={scale} onChange={(e) => setScale(e.target.value as CalendarScale)} className="w-auto">
              <option value="month">شهري</option><option value="week">أسبوعي</option><option value="day">يومي</option>
            </Select>
          )}
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">كل الحالات</option>
          {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView scale={scale} cursor={cursor} setCursor={setCursor} appointments={appointments} customerById={customerById} onSelect={(a) => { setEditingAppt(a); setFormOpen(true); }} />
      ) : appointments.length === 0 ? (
        <div className="surface rounded-xl"><EmptyState title="لا توجد مواعيد" hint="ابدأ بإضافة موعد جديد" /></div>
      ) : (
        <div className="surface rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="surface-hover">
              <tr className="text-right">
                {["العميل", "الهاتف", "النوع", "التاريخ", "البداية", "النهاية", "المسؤول", "المكان", "الحالة", "الملاحظات", "التذكيرات", "الإجراءات"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const c = customerById.get(a.customerId);
                return (
                  <tr key={a.id} className="border-t surface-hover" style={{ borderColor: "var(--border)" }}>
                    <td className="p-3 font-medium">{c?.name || "—"}</td>
                    <td className="p-3" dir="ltr">{c?.phone || "—"}</td>
                    <td className="p-3">{a.type || "—"}</td>
                    <td className="p-3">{a.date}</td>
                    <td className="p-3">{a.startTime}</td>
                    <td className="p-3">{a.endTime || "—"}</td>
                    <td className="p-3">{a.assignedTo || "—"}</td>
                    <td className="p-3">{a.location || "—"}</td>
                    <td className="p-3"><StatusBadge status={a.status} /></td>
                    <td className="p-3 max-w-[160px] truncate">{a.notes || "—"}</td>
                    <td className="p-3 text-xs">{reminderSummary(a.id)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingAppt(a); setFormOpen(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Pencil size={14} /></button>
                        <button onClick={() => setToDelete({ id: a.id, label: `${c?.name || ""} - ${a.date}` })} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AppointmentFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} appointment={editingAppt} />
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onPreview={(file) => previewAppointmentsImport(file, getAppointments(), getCustomers())}
        onCommit={(rows) => {
          let imported = 0;
          rows.forEach((r) => { if (r.data) { const { customerName, ...rest } = r.data as any; addAppointment(rest); imported++; } });
          refresh();
          return { imported, skipped: 0 };
        }}
        displayName={(d: any) => `${d.customerName} — ${d.date} ${d.startTime}`}
      />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && handleDelete(toDelete.id)} title="حذف الموعد" message={`هل أنت متأكد من حذف موعد "${toDelete?.label}"؟`} />
    </div>
  );
}

function CalendarView({
  scale, cursor, setCursor, appointments, customerById, onSelect,
}: { scale: CalendarScale; cursor: Date; setCursor: (d: Date) => void; appointments: Appointment[]; customerById: Map<string, any>; onSelect: (a: Appointment) => void }) {
  function go(dir: 1 | -1) {
    if (scale === "month") setCursor(dir === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1));
    else if (scale === "week") setCursor(dir === 1 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
    else setCursor(dir === 1 ? addDays(cursor, 1) : subDays(cursor, 1));
  }

  const label =
    scale === "month" ? format(cursor, "MMMM yyyy", { locale: ar }) :
    scale === "week" ? `${format(startOfWeek(cursor), "d MMM", { locale: ar })} - ${format(endOfWeek(cursor), "d MMM yyyy", { locale: ar })}` :
    format(cursor, "EEEE d MMMM yyyy", { locale: ar });

  const days = scale === "month"
    ? eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) })
    : scale === "week" ? eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) }) : [cursor];

  function apptsFor(day: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.date), day)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <div className="surface rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => go(-1)} className="p-2 rounded-lg surface-hover border" style={{ borderColor: "var(--border)" }}><ChevronRight size={16} /></button>
        <h3 className="font-bold">{label}</h3>
        <button onClick={() => go(1)} className="p-2 rounded-lg surface-hover border" style={{ borderColor: "var(--border)" }}><ChevronLeft size={16} /></button>
      </div>

      {scale === "day" ? (
        <div className="space-y-2">
          {apptsFor(cursor).length === 0 && <EmptyState title="لا توجد مواعيد في هذا اليوم" />}
          {apptsFor(cursor).map((a) => <AppointmentChip key={a.id} a={a} name={customerById.get(a.customerId)?.name} onClick={() => onSelect(a)} detailed />)}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map((d) => <div key={d} className="text-xs font-semibold text-center py-1" style={{ color: "var(--text-muted)" }}>{d}</div>)}
          {days.map((day) => {
            const dayAppts = apptsFor(day);
            const inMonth = scale === "week" || isSameMonth(day, cursor);
            const limit = scale === "week" ? 6 : 3;
            return (
              <div key={day.toISOString()} className={`border rounded-lg p-1.5 min-h-[90px] ${scale === "week" ? "min-h-[160px]" : ""} ${!inMonth ? "opacity-40" : ""}`} style={{ borderColor: "var(--border)" }}>
                <div className={`text-xs mb-1 ${isSameDay(day, new Date()) ? "text-brand-600 font-bold" : ""}`}>{format(day, "d")}</div>
                <div className="space-y-1">
                  {dayAppts.slice(0, limit).map((a) => <AppointmentChip key={a.id} a={a} name={customerById.get(a.customerId)?.name} onClick={() => onSelect(a)} />)}
                  {dayAppts.length > limit && <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{dayAppts.length - limit} أخرى</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppointmentChip({ a, name, onClick, detailed }: { a: Appointment; name?: string; onClick: () => void; detailed?: boolean }) {
  const colors: Record<string, string> = { "قادم": "bg-blue-500", "مؤكد": "bg-indigo-500", "مكتمل": "bg-emerald-500", "ملغي": "bg-red-500", "لم يحضر": "bg-orange-500", "مؤجل": "bg-purple-500" };
  if (detailed) {
    return (
      <button onClick={onClick} className="w-full text-right surface-hover border rounded-lg p-3 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div>
          <p className="font-medium text-sm">{name || "—"}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.startTime}{a.endTime ? ` - ${a.endTime}` : ""} {a.type ? `· ${a.type}` : ""}</p>
        </div>
        <StatusBadge status={a.status} />
      </button>
    );
  }
  return (
    <button onClick={onClick} className="w-full text-right text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1 surface-hover truncate">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[a.status] || "bg-gray-400"}`} />
      <span className="truncate">{a.startTime} {name}</span>
    </button>
  );
}
