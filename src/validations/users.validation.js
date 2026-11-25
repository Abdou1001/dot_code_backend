import {z} from "zod";

/* =========================
   Update My Profile
========================= */

export const updateMyProfileSchema = z
    .object({
        full_name: z
            .string()
            .trim()
            .min(3, "الاسم قصير جدًا")
            .max(50, "الاسم طويل جدًا")
            .optional(),

        date_of_birth: z.coerce
            .date({
                invalid_type_error: "تاريخ الميلاد غير صالح",
            })
            .refine(
                (date) => date <= new Date(),
                "لا يمكن أن يكون تاريخ الميلاد في المستقبل",
            )
            .refine((date) => {
                const today = new Date();

                let age = today.getFullYear() - date.getFullYear();

                const monthDiff = today.getMonth() - date.getMonth();

                if (
                    monthDiff < 0 ||
                    (monthDiff === 0 && today.getDate() < date.getDate())
                ) {
                    age--;
                }

                return age >= 18;
            }, "يجب ألا يقل العمر عن 18 سنة"),

        gender: z.enum(["ذكر", "أنثى"], {
            error: () => ({
                message: "الجنس غير صالح",
            }),
        }),

        email: z
            .string()
            .trim()
            .email("البريد الإلكتروني غير صالح")
            .optional()
            .or(z.literal("")),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "يجب إرسال حقل واحد على الأقل للتعديل",
    });

/* =========================
   Update User
========================= */

export const updateUserSchema = updateMyProfileSchema;

/* =========================
   Change User Role
========================= */

export const changeUserRoleSchema = z.object({
    role: z.enum(["admin", "reception", "user"], {
        error: () => ({
            message: "الصلاحية غير صالحة",
        }),
    }),
});

/* =========================
   Reception Departments
========================= */

export const updateReceptionDepartmentsSchema = z
    .object({
        depart_ids: z.array(
            z.coerce
                .number("معرف القسم غير صالح")
                .int("معرف القسم غير صالح")
                .positive("معرف القسم غير صالح"),
        ),
    })
    .superRefine((data, ctx) => {
        if (new Set(data.depart_ids).size !== data.depart_ids.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["depart_ids"],
                message: "لا يمكن تكرار الأقسام المحددة.",
            });
        }
    });

/* =========================
   Change Password
========================= */

export const changePasswordSchema = z
    .object({
        current_password: z.string("كلمة المرور الحالية مطلوبة"),

        new_password: z
            .string("كلمة المرور الجديدة مطلوبة")
            .min(6, "كلمة المرور قصيرة جدًا"),

        confirm_password: z.string("تأكيد كلمة المرور مطلوب"),
    })

    .refine((data) => data.new_password === data.confirm_password, {
        path: ["confirm_password"],
        message: "تأكيد كلمة المرور غير متطابق",
    })

    .refine((data) => data.current_password !== data.new_password, {
        path: ["new_password"],
        message: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية",
    });
