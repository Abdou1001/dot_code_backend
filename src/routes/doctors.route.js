import express from "express";
import {validate} from "../middlewares/validation.middleware.js";
import {allowedTo, protect} from "../middlewares/auth.middleware.js";
import {
    getDoctorsInfo,
    getOneDoctorInfo,
} from "../controller/doctors/read.controller.js";
import {
    getMyDoctorAppointments,
    getMyDoctorProfile,
    getMyDoctorSchedules,
    toggleMyDoctorBooking,
} from "../controller/doctors/access.controller.js";
import {
    changeDoctorStatus,
    insertDoctor,
    toggleDoctorVisibility,
    updateDoctor,
} from "../controller/doctors/management.controller.js";
import {
    insertDoctorSchema,
    toggleDoctorBookingSchema,
    updateDoctorSchema,
} from "../validations/doctors.validation.js";
import {uploadSingleImage} from "../middlewares/upload.middleware.js";

// api/doctors/{router}

const router = express.Router();

router
    .get("/", getDoctorsInfo)
    .get("/me", protect, allowedTo("doctor"), getMyDoctorProfile)
    .get(
        "/me/appointments",
        protect,
        allowedTo("doctor"),
        getMyDoctorAppointments,
    )
    .get(
        "/me/schedules",
        protect,
        allowedTo("doctor"),
        getMyDoctorSchedules,
    )
    .patch(
        "/me/booking",
        protect,
        allowedTo("doctor"),
        validate(toggleDoctorBookingSchema),
        toggleMyDoctorBooking,
    )
    .post(
        "/",
        protect,
        allowedTo("admin"),
        uploadSingleImage("path_image"),
        validate(insertDoctorSchema),
        insertDoctor,
    )
    .get("/:id", getOneDoctorInfo)
    .put(
        "/:id",
        protect,
        allowedTo("admin"),
        uploadSingleImage("path_image"),
        validate(updateDoctorSchema),
        updateDoctor,
    )
    .patch("/:id/status", protect, allowedTo("admin"), changeDoctorStatus)
    .patch(
        "/:id/is_hidden",
        protect,
        allowedTo("admin"),
        toggleDoctorVisibility,
    );

export default router;
