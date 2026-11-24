import {z} from "zod";



/* =========================
   Base Appointment Schema
========================= */

const appointmentObject = z.object({
    schedule_id: z.coerce
        .number("الدوام مطلوب")
        .int("معرف الدوام غير صالح")
        .positive("معرف الدوام غير صالح"),

    depart_id: z.coerce
        .number("يجب تحديد القسم الطبي لإتمام الحجز.")
        .int("معرف القسم الطبي غير صالح")
        .positive("معرف القسم الطبي غير صالح"),

    patient_name: z
        .string( "اسم المريض مطلوب")
        .trim()
        .min(3, "اسم المريض قصير جدًا")
        .max(100, "اسم المريض طويل جدًا"),

    patient_phone: z
        .string( "رقم الهاتف مطلوب")
        .trim()
        .regex(/^[0-9]{6,15}$/, "رقم الهاتف غير صالح"),

    patient_age: z.coerce
        .number( "العمر مطلوب")
        .int("العمر غير صالح")
        .min(1, "العمر غير صالح")
        .max(120, "العمر غير صالح"),

    patient_gender: z.enum(["ذكر", "أنثى"], {
        error: () => ({
            message: "الجنس غير صالح",
        }),
    }),

    notes: z.string().trim().max(500, "الملاحظات طويلة جدًا").optional(),

    appointment_date: z
        .string( "تاريخ الموعد مطلوب"),
});

/* =========================
   Insert Appointment Validation
========================= */

export const insertAppointmentSchema = appointmentObject;

/* =========================
   Update Appointment Validation
========================= */

const patientPersonalInformationObject = appointmentObject
    .pick({
        patient_name: true,
        patient_phone: true,
        patient_age: true,
        patient_gender: true,
        notes: true,
    })
    .partial()
    .passthrough();

export const updateAppointmentSchema = patientPersonalInformationObject
    .superRefine((data, ctx) => {
        if (Object.keys(data).length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "يجب إرسال حقل واحد على الأقل للتعديل",
            });
        }

    });

/* =========================
   Change Appointment Status
========================= */

export const changeAppointmentsStatusSchema = z.object({
    status: z.enum(["pending", "approved", "rejected", "cancelled"], {
        error: () => ({
            message: "حالة الحجز غير صالحة",
        }),
    }),

    admin_notes: z.string().max(100, "ملاحظات الإدارة طويلة جدًا").optional(),
});
