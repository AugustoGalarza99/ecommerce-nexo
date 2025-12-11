import express from "express";
import { createPreference, webhook } from "./mp.controller.js";

const router = express.Router();

// Crear preferencia
router.post("/create_preference", createPreference);

// Webhook — NO volver a repetir "/webhook"
router.post("/webhook", webhook);

export default router;
