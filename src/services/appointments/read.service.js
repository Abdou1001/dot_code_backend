import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";
import {
    formatAppointment,
    formatAppointments,
    selectStatment,
} from "./appointment.helpers.js";

export const getAppointments = async ({
    page,
    limit,
    from,
    to,
    queryParams,
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

export const getAppointment = async (id) => {
    const {data: appointment, error} = await supabase
        .from("appointment")
        .select(selectStatment, {count: "exact"})
        .eq("appointment_id", id)
        .single();

    if (!appointment || error)
        throw new ApiError("الحجز غير موجود، حاول مرة اخرى", 404);

    await formatAppointment(appointment);

    return appointment;
};

export const getUserAppointments = async ({
    userId,
    page,
    limit,
    from,
    to,
    queryParams,
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

export const getPendingAppointmentsForReception = async (keyword) => {
    const now = new Date();
    const today = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    let query = supabase
        .from("appointment")
        .select(selectStatment, {count: "exact"})
        .eq("status", "pending")
        .gte("appointment_date", today.toISOString().split("T")[0])
        .lte("appointment_date", tomorrow.toISOString().split("T")[0]);

    if (keyword) query = query.ilike("patient_name", `%${keyword}%`);

    const {data: appointments, error, count} = await query
        .order("appointment_date", {ascending: true})
        .order("created_at", {ascending: true});

    if (error)
        throw new ApiError("حدث خطأ أثناء جلب الحجوزات المعلقة", 500);

    await formatAppointments(appointments || []);

    return {appointments: appointments || [], count: count || 0};
};
