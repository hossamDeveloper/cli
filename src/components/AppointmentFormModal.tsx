import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Appointment, APPOINTMENT_STATUSES, Customer } from "../types";
import { addAppointment, updateAppointment } from "../data/appointmentsStorage";
import { getCustomers } from "../data/customersStorage";
import { addNotification } from "../data/notificationsStorage";
import { Modal } from "./Modal";
import { Button, Field, Input, Select, Textarea } from "./ui";

const schema = z.object({
  customerId: z.string().min(1, "العميل مطلوب"),
  type: z.string().optional(),
  date: z.string().min(1, "التاريخ مطلوب"),
  startTime: z.string().min(1, "وقت البداية مطلوب"),
  endTime: z.string().optional(),
  assignedTo: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.string(),
});
type FormData = z.infer<typeof schema>;

export function AppointmentFormModal({
  open, onClose, onSaved, appointment, fixedCustomer,
}: { open: boolean; onClose: () => void; onSaved: () => void; appointment?: Appointment | null; fixedCustomer?: Customer }) {
  const isEdit = !!appointment;
  const [search, setSearch] = useState("");
  const allCustomers = useMemo(() => getCustomers(), [open]);

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "قادم" },
  });

  const customerId = watch("customerId");
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return allCustomers.slice(0, 8);
    const q = search.trim().toLowerCase();
    return allCustomers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8);
  }, [search, allCustomers]);

  const selectedCustomer = fixedCustomer || allCustomers.find((c) => c.id === customerId);

  useEffect(() => {
    if (open) {
      reset(
        appointment
          ? {
              customerId: appointment.customerId, type: appointment.type || "", date: appointment.date,
              startTime: appointment.startTime, endTime: appointment.endTime || "",
              assignedTo: appointment.assignedTo || "", location: appointment.location || "",
              notes: appointment.notes || "", status: appointment.status || "قادم",
            }
          : { customerId: fixedCustomer?.id || "", status: "قادم", date: new Date().toISOString().slice(0, 10) }
      );
    }
  }, [open, appointment, fixedCustomer, reset]);

  function onSubmit(values: FormData) {
    const payload = { ...values, endTime: values.endTime || undefined, status: values.status as Appointment["status"] };
    if (isEdit) {
      const prevStatus = appointment!.status;
      updateAppointment(appointment!.id, payload);
      if (payload.status === "ملغي" && prevStatus !== "ملغي") {
        addNotification({ type: "cancelled", appointmentId: appointment!.id, message: `تم إلغاء موعد ${selectedCustomer?.name || ""}.` });
      } else {
        addNotification({ type: "updated", appointmentId: appointment!.id, message: `تم تعديل موعد ${selectedCustomer?.name || ""}.` });
      }
      toast.success("تم تحديث الموعد");
    } else {
      addAppointment(payload);
      toast.success("تمت إضافة الموعد بنجاح");
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "تعديل الموعد" : "+ إضافة موعد"} size="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Field label="العميل" required error={errors.customerId?.message}>
          {fixedCustomer ? (
            <Input disabled value={`${fixedCustomer.name} — ${fixedCustomer.phone}`} />
          ) : (
            <>
              <Input placeholder="ابحث عن العميل بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select {...register("customerId")} className="w-full mt-2 rounded-lg border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                <option value="">اختر عميلًا</option>
                {filteredCustomers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
              </select>
              {selectedCustomer && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>الهاتف: {selectedCustomer.phone}</p>}
            </>
          )}
        </Field>

        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="نوع الموعد"><Input {...register("type")} placeholder="مثال: استشارة، متابعة، عقد" /></Field>
          <Field label="الحالة"><Select {...register("status")}>{APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="التاريخ" required error={errors.date?.message}><Input type="date" {...register("date")} /></Field>
          <Field label="المسؤول"><Input {...register("assignedTo")} /></Field>
          <Field label="وقت البداية" required error={errors.startTime?.message}><Input type="time" {...register("startTime")} /></Field>
          <Field label="وقت النهاية"><Input type="time" {...register("endTime")} /></Field>
        </div>
        <Field label="المكان"><Input {...register("location")} /></Field>
        <Field label="ملاحظات"><Textarea {...register("notes")} /></Field>

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "جارٍ الحفظ..." : "حفظ"}</Button>
        </div>
      </form>
    </Modal>
  );
}
