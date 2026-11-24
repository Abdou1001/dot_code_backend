import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {deleteByPattern, deleteCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";

/** Creates a schedule after validating the doctor, status, and duplicate slot. */
export const assignDoctorsSchedules = async ({
    day_of_week,
    shift_type,
    start_time,
    end_time,
    doctor_id,
    notes = "",
    max_patients,
    status,
}) => {
    const {data: doctor, error: doctorError} = await supabase
        .from("doctor")
        .select("doctor_id,status,is_hidden,path_image")
        .eq("doctor_id", doctor_id)
        .single();

    if (!doctor || doctorError) {
        throw new ApiError("الطبيب غير موجود، حاول مرة اخرى", 404);
    }
    if (doctor.is_hidden) {
        throw new ApiError("الطبيب غير متاح", 400);
    }
    if (doctor.status !== "active") {
        throw new ApiError("الطبيب غير مفعل", 400);
    }
    if (status && !["active", "inactive"].includes(status)) {
        throw new ApiError("حالة الدوام غير صالحة", 400);
    }

    const {data: existingSchedule} = await supabase
        .from("doctor_schedule")
        .select("schedule_id")
        .eq("doctor_id", doctor_id)
        .eq("day_of_week", day_of_week)
        .eq("start_time", start_time)
        .eq("end_time", end_time)
        .maybeSingle();

    if (existingSchedule) {
        throw new ApiError("يوجد دوام بنفس البيانات لهذا الطبيب", 400);
    }

    const {data: assign, error} = await supabase
        .from("doctor_schedule")
        .insert({
            day_of_week,
            shift_type,
            start_time,
            end_time,
            doctor_id,
            notes,
            max_patients,
            status: status ?? "active",
        })
        .select("*, doctor(*)")
        .single();

    if (!assign || error) {
        throw new ApiError("حدث خطأ أثناء إضافة دوام الطبيب، حاول مرة اخرى", 400);
    }

    await deleteByPattern("doctor-schedules:*");
    await deleteCache(CACHE_KEYS.DOCTOR_SCHEDULE(doctor_id));
    await deleteCache(CACHE_KEYS.DOCTOR(doctor_id));
    await deleteCache(CACHE_KEYS.DASHBOARD);

    assign.doctor.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DOCTORS,
        assign.doctor.path_image,
    );

    return assign;
};

/** Updates a schedule after checking its doctor and duplicate schedule slot. */
export const updateDoctorsSchedules = async (
    id,
    {
        day_of_week,
        shift_type,
        start_time,
        end_time,
        doctor_id,
        notes = "",
        max_patients,
        status,
    },
) => {
    const {data: schedule, error: scheduleError} = await supabase
        .from("doctor_schedule")
        .select("*")
        .eq("schedule_id", id)
        .single();

    if (!schedule || scheduleError) {
        throw new ApiError("الدوام غير موجود، حاول مرة اخرى", 404);
    }

    const {data: doctor, error: doctorError} = await supabase
        .from("doctor")
        .select("doctor_id,status,is_hidden,path_image")
        .eq("doctor_id", doctor_id)
        .single();

    if (!doctor || doctorError) {
        throw new ApiError("الطبيب غير موجود، حاول مرة اخرى", 404);
    }
    if (doctor.is_hidden) {
        throw new ApiError("الطبيب غير متاح", 400);
    }
    if (doctor.status !== "active") {
        throw new ApiError("الطبيب غير مفعل", 400);
    }

    const isChanged =
        schedule.day_of_week !== day_of_week ||
        schedule.shift_type !== shift_type ||
        schedule.start_time !== start_time ||
        schedule.end_time !== end_time ||
        schedule.max_patients !== max_patients ||
        schedule.status !== status ||
        (schedule.notes ?? "") !== (notes ?? "");

    if (isChanged) {
        const {data: existingSchedule} = await supabase
            .from("doctor_schedule")
            .select("schedule_id")
            .eq("doctor_id", doctor_id)
            .eq("day_of_week", day_of_week)
            .eq("start_time", start_time)
            .eq("end_time", end_time)
            .neq("schedule_id", id)
            .maybeSingle();

        if (existingSchedule) {
            throw new ApiError("يوجد دوام بنفس البيانات لهذا الطبيب", 400);
        }
    }

    const {data: update, error} = await supabase
        .from("doctor_schedule")
        .update({
            day_of_week,
            shift_type,
            start_time,
            end_time,
            doctor_id,
            notes,
            max_patients,
            status,
        })
        .eq("schedule_id", id)
        .select("*, doctor(*)")
        .single();

    if (!update || error) {
        throw new ApiError("حدث خطأ أثناء تعديل الدوام، حاول مرة اخرى", 400);
    }

    await deleteByPattern("doctor-schedules:*");
    await deleteCache(CACHE_KEYS.DOCTOR_SCHEDULE(update.doctor_id));
    await deleteCache(CACHE_KEYS.DOCTOR(update.doctor_id));
    await deleteCache(CACHE_KEYS.DASHBOARD);

    update.doctor.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DOCTORS,
        update.doctor.path_image,
    );

    return update;
};

/** Deletes a schedule only when no appointment uses it. */
export const deleteDoctorsSchedules = async (id) => {
    const {data: schedule, error: scheduleError} = await supabase
        .from("doctor_schedule")
        .select("schedule_id, doctor_id")
        .eq("schedule_id", id)
        .single();

    if (!schedule || scheduleError) {
        throw new ApiError("الدوام غير موجود، حاول مرة اخرى", 404);
    }

    const {count} = await supabase
        .from("appointment")
        .select("*", {count: "exact", head: true})
        .eq("schedule_id", id);

    if (count > 0) {
        throw new ApiError(
            "لا يمكن حذف هذا الدوام لوجود حجوزات مرتبطة به، يمكنك إيقافه بدلاً من حذفه.",
            400,
        );
    }

    const {data: deleteSchdule, error} = await supabase
        .from("doctor_schedule")
        .delete()
        .eq("schedule_id", id)
        .select("*");

    if (!deleteSchdule || error) {
        throw new ApiError("حدث خطأ أثناء حذف الدوام، حاول مرة اخرى", 400);
    }

    const doctorId = schedule.doctor_id;
    await deleteByPattern("doctor-schedules:*");
    await deleteCache(CACHE_KEYS.DOCTOR_SCHEDULE(doctorId));
    await deleteCache(CACHE_KEYS.DOCTOR(doctorId));
    await deleteCache(CACHE_KEYS.DASHBOARD);

    return deleteSchdule;
};

/** Toggles a doctor's schedule between active and inactive states. */
export const changeDoctorScheduleStatus = async (id) => {
    const {data: schedule, error: scheduleError} = await supabase
        .from("doctor_schedule")
        .select("*")
        .eq("schedule_id", id)
        .single();

    if (!schedule || scheduleError) {
        throw new ApiError("الدوام غير موجود", 404);
    }

    const newStatus = schedule.status === "active" ? "inactive" : "active";
    const {data: updatedSchedule, error} = await supabase
        .from("doctor_schedule")
        .update({status: newStatus})
        .eq("schedule_id", id)
        .select("*")
        .single();

    if (!updatedSchedule || error) {
        throw new ApiError("حدث خطأ أثناء تحديث حالة الدوام", 400);
    }

    await deleteByPattern("doctor-schedules:*");
    await deleteCache(CACHE_KEYS.DOCTOR_SCHEDULE(updatedSchedule.doctor_id));
    await deleteCache(CACHE_KEYS.DOCTOR(updatedSchedule.doctor_id));
    await deleteCache(CACHE_KEYS.DASHBOARD);

    return updatedSchedule;
};
