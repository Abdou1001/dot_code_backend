import express from "express";

import {optionalProtect} from "../middlewares/auth.middleware.js";

import {
    registerDevice,
    removeDevice,
} from "../controller/device/management.controller.js";

const router = express.Router();

// api/devices/{router}

router
    .post("/", optionalProtect, registerDevice)
    .delete("/", optionalProtect, removeDevice);

export default router;
