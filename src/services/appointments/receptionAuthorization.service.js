import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";

const RECEPTION_ACCESS_MESSAGE = "ليس لديك صلاحية الوصول إلى حجوزات هذا القسم.";

/**
 * Retrieves the department IDs assigned to a Reception employee.
 */
export const getReceptionDepartmentIds = async (userId) => {
    const {data: receptionDepartments, error} = await supabase
        .from("reception_departments")
        .select("depart_id")
        .eq("user_id", userId);

    if (error)
        throw new ApiError("حدث خطأ أثناء التحقق من صلاحيات الاستقبال.", 500);

    return receptionDepartments?.map((department) => department.depart_id) || [];
};

/**
 * Applies an already-resolved Reception department filter to a Supabase query builder.
 */
export const restrictAppointmentsForReception = (query, departmentIds) => {
    if (departmentIds === null) return query;

    // Department IDs are positive, so -1 deterministically returns no rows when none are assigned.
    return query.in(
        "depart_id",
        departmentIds.length > 0 ? departmentIds : [-1],
    );
};

/**
 * Resolves Reception department assignments without exposing query builders across async boundaries.
 */
export const getAuthorizedReceptionDepartmentIds = async (user) => {
    if (user.role !== "reception") return null;

    return getReceptionDepartmentIds(user.user_id);
};

/**
 * Prevents Reception employees from managing appointments outside their departments.
 */
export const assertReceptionAppointmentAccess = async (appointment, user) => {
    if (user.role !== "reception") return;

    const departmentIds = await getReceptionDepartmentIds(user.user_id);

    if (!departmentIds.includes(appointment.depart_id))
        throw new ApiError(RECEPTION_ACCESS_MESSAGE, 403);
};
