import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";
import {
    formatAppointment,
    formatAppointments,
    selectStatment,
} from "./appointment.helpers.js";
import {
    getAuthorizedReceptionDepartmentIds,
    restrictAppointmentsForReception,
    assertReceptionAppointmentAccess,
} from "./receptionAuthorization.service.js";
import {getReceptionPendingDates} from "./receptionDate.service.js";
import {getLinkedDoctor} from "../doctors/access.service.js";

/**
 * Retrieves appointments with filters, pagination, and Reception department restrictions.
 */
export const getAppointments = async ({
    page,
    limit,
    from,
    to,
    queryParams,
    user,
}) => {
    const {
        keyword = "",
        status,
        day_of_week,
        appointment_date,
        from_date,
        to_date,
        patient_gender,
        sort = "-created_at",
    } = queryParams;

    let query = supabase
        .from("appointment")
        .select(selectStatment, {count: "exact"});

    const departmentIds = await getAuthorizedReceptionDepartmentIds(user);
    query = restrictAppointmentsForReception(query, departmentIds);

    if (keyword) {
        const {data: doctors} = await supabase
            .from("doctor")
            .select("doctor_id")
            .ilike("full_name", `%${keyword}%`);

        const doctorIds = doctors?.map((doctor) => doctor.doctor_id) || [];

        const {data: schedules} = await supabase
            .from("doctor_schedule")
            .select("schedule_id")
            .in("doctor_id", doctorIds);

        const scheduleIds = schedules?.map((schedule) => schedule.schedule_id) || [];

        query = query.or(
            `patient_name.ilike.%${keyword}%, patient_phone.ilike.%${keyword}%, schedule_id.in.(${scheduleIds.join(",")})`,
        );
    }

    if (status) query = query.eq("status", status);
    if (appointment_date) query = query.eq("appointment_date", appointment_date);
    if (from_date) query = query.gte("appointment_date", from_date);
    if (to_date) query = query.lte("appointment_date", to_date);
    if (patient_gender) query = query.eq("patient_gender", patient_gender);

    if (day_of_week) {
        const {data: schedules} = await supabase
            .from("doctor_schedule")
            .select("schedule_id")
            .eq("day_of_week", day_of_week);

        query = query.in(
            "schedule_id",
            schedules?.map((schedule) => schedule.schedule_id) || [],
        );
    }

    query = query.order(
        sort.startsWith("-") ? sort.substring(1) : sort,
        {ascending: !sort.startsWith("-")},
    );

    const {data: appointments, error, count} = await query.range(from, to);

    if (!appointments || error)
        throw new ApiError("حدث خطأ أثناء جلب الطلبات", 500);

    await formatAppointments(appointments);

    return {appointments, count};
};

/** Retrieves one appointment after applying Reception department authorization. */
export const getAppointment = async (id, user) => {
    const {data: appointment, error} = await supabase
        .from("appointment")
        .select(selectStatment, {count: "exact"})
        .eq("appointment_id", id)
        .single();

    if (!appointment || error)
        throw new ApiError("الحجز غير موجود، حاول مرة اخرى", 404);

    await assertReceptionAppointmentAccess(appointment, user);

    await formatAppointment(appointment);

    return appointment;
};

/** Retrieves a user's appointments while retaining Reception department scope. */
export const getUserAppointments = async ({
    userId,
    page,
    limit,
    from,
    to,
    queryParams,
    user,
}) => {
    const {
        keyword = "",
        status,
        from_date,
        to_date,
        day_of_week,
        sort = "-created_at",
    } = queryParams;

    let query = supabase
        .from("appointment")
        .select(selectStatment, {count: "exact"})
        .eq("user_id", userId);

    const departmentIds = await getAuthorizedReceptionDepartmentIds(user);
    query = restrictAppointmentsForReception(query, departmentIds);

    if (keyword) {
        const {data: doctors} = await supabase
            .from("doctor")
            .select("doctor_id")
            .ilike("full_name", `%${keyword}%`);

        const {data: schedules} = await supabase
            .from("doctor_schedule")
            .select("schedule_id")
            .in(
                "doctor_id",
                doctors?.map((doctor) => doctor.doctor_id) || [],
            );

        const conditions = [
            `patient_name.ilike.%${keyword}%`,
            `patient_phone.ilike.%${keyword}%`,
        ];
        const scheduleIds = schedules?.map((schedule) => schedule.schedule_id) || [];

        if (scheduleIds.length > 0)
            conditions.push(`schedule_id.in.(${scheduleIds.join(",")})`);

        query = query.or(conditions.join(","));
    }

    if (status) query = query.eq("status", status);
    if (from_date) query = query.gte("appointment_date", from_date);
    if (to_date) query = query.lte("appointment_date", to_date);

    if (day_of_week) {
        const {data: schedules} = await supabase
            .from("doctor_schedule")
            .select("schedule_id")
            .eq("day_of_week", day_of_week);

        query = query.in(
            "schedule_id",
            schedules?.map((schedule) => schedule.schedule_id) || [],
        );
    }

    query = query.order(
        sort.startsWith("-") ? sort.substring(1) : sort,
        {ascending: !sort.startsWith("-")},
    );

    const {data: appointments, error, count} = await query.range(from, to);

    if (!appointments || error)
        throw new ApiError("حدث خطأ أثناء جلب الحجوزات", 500);

    await formatAppointments(appointments);

    return {appointments, count};
};

/**
 * Retrieves today's and tomorrow's pending appointments for authorized departments.
 */
export const getPendingAppointmentsForReception = async (keyword, user) => {
    const {today, tomorrow} = getReceptionPendingDates();

    let query = supabase
        .from("appointment")
        .select(selectStatment, {count: "exact"})
        .eq("status", "pending")
        .gte("appointment_date", today)
        .lte("appointment_date", tomorrow);

    const departmentIds = await getAuthorizedReceptionDepartmentIds(user);
    query = restrictAppointmentsForReception(query, departmentIds);

    if (keyword) query = query.ilike("patient_name", `%${keyword}%`);

    const {data: appointments, error, count} = await query
        .order("appointment_date", {ascending: true})
        .order("created_at", {ascending: true});

    if (error)
        throw new ApiError("حدث خطأ أثناء جلب الحجوزات المعلقة", 500);

    await formatAppointments(appointments || []);

    return {appointments: appointments || [], count: count || 0};
};

/**
 * Retrieves appointments belonging to the authenticated doctor.
 *
 * Resolves the doctor from the authenticated user ID and constrains the
 * appointment query to that doctor's schedule IDs before pagination.
 *
 * @param {object} options - Doctor identity, pagination values, and filters.
 * @param {number} options.userId - Authenticated doctor user ID.
 * @param {number} options.from - Pagination start offset.
 * @param {number} options.to - Pagination end offset.
 * @param {object} options.queryParams - Appointment filters and sorting.
 * @returns {Promise<object>} Formatted doctor appointments and total count.
 */
export const getDoctorAppointments = async ({
    userId,
    from,
    to,
    queryParams,
}) => {
    const {
        keyword = "",
        status,
        appointment_date,
        from_date,
        to_date,
        patient_gender,
        day_of_week,
        sort = "-created_at",
    } = queryParams;

    // 1. Resolve the doctor from the JWT-authenticated account.
    const doctor = await getLinkedDoctor(userId);

    // 2. Build the authorized schedule list before querying appointments.
    let schedulesQuery = supabase
        .from("doctor_schedule")
        .select("schedule_id")
        .eq("doctor_id", doctor.doctor_id);

    if (day_of_week) schedulesQuery = schedulesQuery.eq("day_of_week", day_of_week);

    const {data: schedules, error: schedulesError} = await schedulesQuery;

    if (schedulesError)
        throw new ApiError("حدث خطأ أثناء جلب أوقات دوام الطبيب", 500);

    const scheduleIds = schedules.map((schedule) => schedule.schedule_id);

    if (scheduleIds.length === 0) return {appointments: [], count: 0};

    // 3. Restrict appointments by the server-derived schedule IDs.
    let query = supabase
        .from("appointment")
        .select(selectStatment, {count: "exact"})
        .in("schedule_id", scheduleIds);

    if (keyword) {
        const normalizedKeyword = keyword.toLowerCase();
        const doctorMatchesKeyword = doctor.full_name
            ?.toLowerCase()
            .includes(normalizedKeyword);

        if (!doctorMatchesKeyword) {
            query = query.or(
                `patient_name.ilike.%${keyword}%, patient_phone.ilike.%${keyword}%`,
            );
        }
    }

    if (status) query = query.eq("status", status);
    if (appointment_date) query = query.eq("appointment_date", appointment_date);
    if (from_date) query = query.gte("appointment_date", from_date);
    if (to_date) query = query.lte("appointment_date", to_date);
    if (patient_gender) query = query.eq("patient_gender", patient_gender);

    // 4. Execute the restricted query only after filters and sorting are chained.
    query = query.order(
        sort.startsWith("-") ? sort.substring(1) : sort,
        {ascending: !sort.startsWith("-")},
    );

    const {data: appointments, error, count} = await query.range(from, to);

    if (!appointments || error)
        throw new ApiError("حدث خطأ أثناء جلب حجوزات الطبيب", 500);

    // 5. Preserve the standard appointment response formatting.
    await formatAppointments(appointments);

    return {appointments, count};
};
