import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import ApiError from "../../utils/ApiError.js";
import {getCache, setCache} from "../cache.service.js";

const platform_fee_ = Number(process.env.PLATFORM_FEE);

/**
 * Retrieves cached or calculated dashboard statistics.
 *
 * @returns {Promise<{message: string, results: object}>} Dashboard metrics.
 */
export const statisticsDashboard = async () => {
    const cachedStatistics = await getCache(CACHE_KEYS.DASHBOARD);

    if (cachedStatistics) {
        return {
            message: "تم جلب البيانات من Redis",
            results: cachedStatistics,
        };
    }

    // Preserve the existing current-month boundary calculation.
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const firstDay = firstDayOfMonth.toISOString();

    const [
        {count: numberUsers, error: userError},
        {count: numberDoctors, error: doctorError},
        {count: numberDepartments, error: departmentError},
        {count: numberAds, error: adsError},
        {count: numberAppointments, error: appointmentError},
        {count: acceptedAppointments, error: acceptedError},
        {count: pendingAppointments, error: pendingError},
        {count: rejectedAppointments, error: rejectedError},
        {count: cancelledAppointments, error: cancelledError},
        {count: appointmentsThisMonth, error: monthAppointmentsError},
        {
            count: acceptedAppointmentsThisMonth,
            error: acceptedThisMonthError,
        },
    ] = await Promise.all([
        supabase.from("user").select("*", {count: "exact", head: true}),
        supabase.from("doctor").select("*", {count: "exact", head: true}),
        supabase.from("department").select("*", {count: "exact", head: true}),
        supabase.from("ads").select("*", {count: "exact", head: true}),
        supabase.from("appointment").select("*", {count: "exact", head: true}),
        supabase
            .from("appointment")
            .select("*", {count: "exact", head: true})
            .eq("status", "approved"),
        supabase
            .from("appointment")
            .select("*", {count: "exact", head: true})
            .eq("status", "pending"),
        supabase
            .from("appointment")
            .select("*", {count: "exact", head: true})
            .eq("status", "rejected"),
        supabase
            .from("appointment")
            .select("*", {count: "exact", head: true})
            .eq("status", "cancelled"),
        supabase
            .from("appointment")
            .select("*", {count: "exact", head: true})
            .gte("created_at", firstDay),
        supabase
            .from("appointment")
            .select("*", {count: "exact", head: true})
            .eq("status", "approved")
            .gte("created_at", firstDay),
    ]);

    if (userError) throw new ApiError("حدث خطأ أثناء جلب عدد المستخدمين", 500);
    if (doctorError) throw new ApiError("حدث خطأ أثناء جلب عدد الأطباء", 500);
    if (departmentError) throw new ApiError("حدث خطأ أثناء جلب عدد الأقسام", 500);
    if (adsError) throw new ApiError("حدث خطأ أثناء جلب عدد الإعلانات", 500);
    if (appointmentError) throw new ApiError("حدث خطأ أثناء جلب عدد الحجوزات", 500);
    if (acceptedError) throw new ApiError("حدث خطأ أثناء جلب الحجوزات المقبولة", 500);
    if (pendingError) throw new ApiError("حدث خطأ أثناء جلب الحجوزات قيد المراجعة", 500);
    if (rejectedError) throw new ApiError("حدث خطأ أثناء جلب الحجوزات المرفوضة", 500);
    if (cancelledError) throw new ApiError("حدث خطأ أثناء جلب الحجوزات الملغية", 500);
    if (monthAppointmentsError) throw new ApiError("حدث خطأ أثناء جلب حجوزات هذا الشهر", 500);
    if (acceptedThisMonthError) {
        throw new ApiError("حدث خطأ أثناء جلب الحجوزات المقبولة لهذا الشهر", 500);
    }

    const results = {
        numberUsers,
        numberDoctors,
        numberDepartments,
        numberAds,
        numberAppointments,
        acceptedAppointments,
        pendingAppointments,
        rejectedAppointments,
        cancelledAppointments,
        appointmentsThisMonth,
        acceptedAppointmentsThisMonth,
        totalRevenue: (acceptedAppointments || 0) * platform_fee_,
        monthlyRevenue: (acceptedAppointmentsThisMonth || 0) * platform_fee_,
    };

    await setCache(CACHE_KEYS.DASHBOARD, results, CACHE_TTL.DASHBOARD);

    return {message: "تم جلب البيانات بنجاح", results};
};

/**
 * Retrieves cached or calculated monthly appointment chart data.
 *
 * @param {number|string|undefined} requestedYear - Optional chart year.
 * @returns {Promise<{message: string, year: number, results: object[], statistics: object}>}
 */
export const appointmentsChart = async (requestedYear) => {
    const year = Number(requestedYear) || new Date().getFullYear();
    const cacheKey = `${CACHE_KEYS.APPOINTMENTS_CHART}:${year}`;
    const cachedChart = await getCache(cacheKey);

    if (cachedChart) {
        return {message: "تم جلب البيانات من Redis", year, ...cachedChart};
    }

    const {data, error} = await supabase.rpc("get_appointments_by_month", {
        selected_year: year,
    });

    if (error) {
        throw new ApiError("حدث خطأ أثناء جلب بيانات الرسم البياني", 500);
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentMonthAppointments =
        data.find((item) => item.month_number === currentMonth)?.total ?? 0;
    const previousMonthAppointments =
        data.find((item) => item.month_number === currentMonth - 1)?.total ?? 0;
    let growth = 0;

    if (previousMonthAppointments > 0) {
        growth = Number(
            (
                ((currentMonthAppointments - previousMonthAppointments) /
                    previousMonthAppointments) *
                100
            ).toFixed(1),
        );
    }

    const response = {
        results: data,
        statistics: {
            currentMonthAppointments,
            previousMonthAppointments,
            growth,
        },
    };

    await setCache(cacheKey, response, CACHE_TTL.DASHBOARD);

    return {message: "تم جلب البيانات بنجاح", year, ...response};
};
