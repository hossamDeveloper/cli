import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Customer, CustomerType, CUSTOMER_STATUSES } from "../types";
import { addCustomer, updateCustomer, findCustomerByPhone } from "../data/customersStorage";
import { Modal } from "./Modal";
import { Button, Field, Input, Select, Textarea } from "./ui";

const schema = z.object({
  name: z.string().trim().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().trim().min(6, "رقم الهاتف مطلوب"),
  whatsapp: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  customerTypeId: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const emptyForm: FormData = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  customerTypeId: "",
  company: "",
  jobTitle: "",
  address: "",
  city: "",
  source: "",
  assignedTo: "",
  status: "جديد",
  notes: "",
};

export function CustomerFormModal({
  open, onClose, onSaved, customer, customerTypes,
}: { open: boolean; onClose: () => void; onSaved: () => void; customer?: Customer | null; customerTypes: CustomerType[] }) {
  const isEdit = !!customer;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (open) {
      reset(
        customer
          ? {
              name: customer.name, phone: customer.phone, whatsapp: customer.whatsapp || "",
              email: customer.email || "", customerTypeId: customer.customerTypeId || "",
              company: customer.company || "", jobTitle: customer.jobTitle || "",
              address: customer.address || "", city: customer.city || "", source: customer.source || "",
              assignedTo: customer.assignedTo || "", status: customer.status || "جديد", notes: customer.notes || "",
            }
          : emptyForm
      );
    }
  }, [open, customer, reset]);

  async function onSubmit(values: FormData) {
    const dupe = findCustomerByPhone(values.phone);
    if (dupe && dupe.id !== customer?.id) {
      toast.error("هذا العميل موجود بالفعل (رقم الهاتف مستخدم)");
      return;
    }
    const payload = { ...values, customerTypeId: values.customerTypeId || undefined, status: values.status as Customer["status"] };
    if (isEdit) {
      updateCustomer(customer!.id, payload);
      toast.success("تم تحديث بيانات العميل");
    } else {
      addCustomer(payload);
      toast.success("تم إضافة العميل بنجاح");
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "تعديل بيانات العميل" : "إضافة عميل"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="الاسم الكامل" required error={errors.name?.message}><Input {...register("name")} error={!!errors.name} /></Field>
          <Field label="رقم الهاتف" required error={errors.phone?.message}><Input {...register("phone")} error={!!errors.phone} dir="ltr" /></Field>
          <Field label="WhatsApp"><Input {...register("whatsapp")} dir="ltr" /></Field>
          <Field label="البريد الإلكتروني" error={errors.email?.message}><Input {...register("email")} dir="ltr" /></Field>
          <Field label="نوع العميل">
            <Select {...register("customerTypeId")}>
              <option value="">— بدون —</option>
              {customerTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select {...register("status")}>{CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </Field>
          <Field label="الشركة"><Input {...register("company")} /></Field>
          <Field label="الوظيفة"><Input {...register("jobTitle")} /></Field>
          <Field label="المدينة"><Input {...register("city")} /></Field>
          <Field label="مصدر العميل"><Input {...register("source")} /></Field>
          <Field label="المسؤول عن العميل"><Input {...register("assignedTo")} placeholder="اسم المسؤول" /></Field>
          <Field label="العنوان"><Input {...register("address")} /></Field>
        </div>
        <Field label="ملاحظات"><Textarea {...register("notes")} /></Field>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "جارٍ الحفظ..." : "حفظ"}</Button>
        </div>
      </form>
    </Modal>
  );
}
