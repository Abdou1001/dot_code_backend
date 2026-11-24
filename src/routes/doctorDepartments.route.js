import express from "express";
import {validate} from "../middlewares/validation.middleware.js";
import {allowedTo, protect} from "../middlewares/auth.middleware.js";
import {
    getDepartmentsByDoctor,
    getDoctorDepartmentsInfo,
    getDoctorsByDepartment,
    getOneDoctorDepartmentInfo,
} from "../controller/doctorDepartments/read.controller.js";
import {
    assignDoctorToDepartment,
    deleteDoctorFromDepartment,
    updateDoctorDepartment,
} from "../controller/doctorDepartments/management.controller.js";
import {CRUDDoctorToDepartmentSchema} from "../validations/doctorDepartments.validation.js";


// api/doctor-departments/{router}

const router = express.Router();


router
    .get("/", getDoctorDepartmentsInfo)
    .post(
        "/",
        protect,
        allowedTo("admin"),
        validate(CRUDDoctorToDepartmentSchema),
        assignDoctorToDepartment,
    )
    .get("/department/:id", getDoctorsByDepartment)
    .get("/doctor/:id", getDepartmentsByDoctor)
    .get("/:id", protect, allowedTo("admin"), getOneDoctorDepartmentInfo)
    .put(
        "/:id",
        protect,
        allowedTo("admin"),
        validate(CRUDDoctorToDepartmentSchema),
        updateDoctorDepartment,
    )
    .delete("/:id", protect, allowedTo("admin"), deleteDoctorFromDepartment);







export default router;
