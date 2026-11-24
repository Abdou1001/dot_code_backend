import express from "express";
import {validate} from "../middlewares/validation.middleware.js";
import {allowedTo, protect} from "../middlewares/auth.middleware.js";
import {getAppointmentsInfo, getMyAppointments, getOneAppointmentInfo, getPendingAppointments} from "../controller/appointments/read.controller.js";
import {createAppointment} from "../controller/appointments/create.controller.js";
import {updateAppointment} from "../controller/appointments/update.controller.js";
import {cancelAppointment, changeAppointmentsStatus} from "../controller/appointments/status.controller.js";
import {
    changeAppointmentsStatusSchema,
    insertAppointmentSchema,
    updateAppointmentSchema,
} from "../validations/appointments.validation.js";
import {uploadSingleImage} from "../middlewares/upload.middleware.js";

// api/appointments/{router}

const router = express.Router();

router
    .get("/", protect, allowedTo("admin", "reception"), getAppointmentsInfo)
    .post(
        "/",
        protect,
        uploadSingleImage("payment_receipt"),
        validate(insertAppointmentSchema),
        createAppointment,
    )

    .get("/my-appointments", protect, getMyAppointments)

    .get(
        "/pending",
        protect,
        allowedTo("admin", "reception"),
        getPendingAppointments,
    )

    .get(
        "/:id",
        protect,
        allowedTo("admin", "reception"),
        getOneAppointmentInfo,
    )
    .put(
        "/:id",
        protect,
        uploadSingleImage("payment_receipt"),
        validate(updateAppointmentSchema),
        updateAppointment,
    )
    .patch(
        "/:id/status",
        protect,
        allowedTo("admin", "reception"),
        validate(changeAppointmentsStatusSchema),
        changeAppointmentsStatus,
    )
    .patch("/:id/cancel", protect, cancelAppointment);

export default router;
