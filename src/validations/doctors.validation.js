import {z} from "zod";
import {supabase} from "../config/supabase.js";
import {isValidYemenPhone} from "../utils/phone.js";

const doctorRelationsSchema = z.union([z.string(), z.array(z.unknown())]);
const forbiddenDoctorUpdateFields = [
    "password",
    "password_hash",
    "role",
    "user_id",
    "phone_verified",
    "is_active",
    "is_Active",
    "phone_otp",
    "phone_otp_expires",
    "password_reset_code",
    "password_reset_expires",
    "password_changed_at",
];

/* =========================
   Insert Doctor Validation
========================= */

export const insertDoctorSchema = z
    .object({
        full_name: z
            .string("اسم الدكتور مطلوب")
            .min(3, "اسم الدكتور قصير جدًا")
            .max(50, "اسم الدكتور طويل جدًا"),

        email: z
            .union([
                z.literal(""),
                z.string().email("البريد الإلكتروني غير صالح").trim(),
            ])
            .optional(),

        bio: z
            .string("الوصف مطلوب")
            .min(10, "الوصف قصير جدًا")
            .max(5000, "الوصف طويل جدًا"),

        education: z
            .string()
            .min(3, "المؤهل العلمي قصير جدًا")
            .max(100, "المؤهل العلمي طويل جدًا")
            .optional(),

        gender: z.enum(["ذكر", "أنثى"], {
            error: () => ({
                message: "الجنس غير صالح",
            }),
        }),

        years_exper: z.coerce
            .number("سنوات الخبرة مطلوبة")
            .min(0, "سنوات الخبرة غير صالحة")
            .max(60, "سنوات الخبرة غير صالحة"),

        phone_number: z
            .string("رقم الهاتف مطلوب")
            .trim()
            .refine(isValidYemenPhone, "رقم الهاتف اليمني غير صالح"),

        notes: z.string().max(500, "الملاحظات طويلة جدًا").optional(),

        consultation_fee: z.coerce
            .number("سعر الاستشارة مطلوب")
            .positive("سعر الاستشارة غير صالح"),

        password: z
            .string("كلمة المرور مطلوبة")
            .min(6, "كلمة المرور يجب أن تكون على الأقل 6 أحرف"),

        date_of_birth: z.coerce.date({
            required_error: "تاريخ الميلاد مطلوب",
            invalid_type_error: "تاريخ الميلاد غير صالح",
        }),

        department_ids: doctorRelationsSchema.optional(),

        schedules: doctorRelationsSchema.optional(),
    })

    .superRefine(async (data, ctx) => {
        if (!data.email) return;

        const {data: doctor} = await supabase
            .from("doctor")
            .select("doctor_id")
            .eq("email", data.email);

        if (doctor && doctor.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["email"],
                message: "البريد الإلكتروني مستخدم بالفعل",
            });
        }
    });

/* =========================
   Update Doctor Validation
========================= */

export const updateDoctorSchema = z
    .object({
        full_name: z
            .string()
            .min(3, "اسم الدكتور قصير جدًا")
            .max(100, "اسم الدكتور طويل جدًا")
            .optional(),

        email: z
            .union([
                z.literal(""),
                z.string().email("البريد الإلكتروني غير صالح").trim(),
            ])
            .optional(),

        bio: z
            .string()
            .min(10, "الوصف قصير جدًا")
            .max(5000, "الوصف طويل جدًا"),

        education: z
            .string()
            .min(3, "المؤهل العلمي قصير جدًا")
            .max(100, "المؤهل العلمي طويل جدًا")
            .optional(),

        gender: z.enum(["ذكر", "أنثى"], {
            error: () => ({
                message: "الجنس غير صالح",
            }),
        }),

        years_exper: z.coerce
            .number()
            .min(0, "سنوات الخبرة غير صالحة")
            .max(60, "سنوات الخبرة غير صالحة")
            .optional(),

        phone_number: z
            .string()
            .trim()
            .refine(isValidYemenPhone, "رقم الهاتف اليمني غير صالح")
            .optional(),

        notes: z.string().max(500, "الملاحظات طويلة جدًا").optional(),

        consultation_fee: z.coerce
            .number()
            .min(1000)
            .max(50000)
            .positive("سعر الاستشارة غير صالح"),

        date_of_birth: z.coerce
            .date({
                invalid_type_error: "تاريخ الميلاد غير صالح",
            })
            .optional(),

        department_ids: doctorRelationsSchema.optional(),

        schedules: doctorRelationsSchema.optional(),
    })
    .passthrough()
    .superRefine((data, ctx) => {
        const forbiddenField = forbiddenDoctorUpdateFields.find(
            (field) => data[field] !== undefined,
        );

        if (forbiddenField) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [forbiddenField],
                message: "لا يمكن تعديل بيانات حساب الطبيب المحمية من خلال هذا المسار.",
            });
        }

        if (Object.keys(data).length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "يجب إرسال حقل واحد على الأقل للتعديل",
            });
        }
    });
