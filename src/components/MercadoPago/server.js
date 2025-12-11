import express from "express";
import cors from "cors";
import mpRoutes from "./mp.routes.js";

const app = express();
app.use(cors());

// SOLO usar RAW para el webhook, no para todo el backend
app.use("/mp/webhook", express.raw({ type: "*/*" }));

// Para el resto, usar JSON normal
app.use(express.json());

app.use("/mp", mpRoutes);

app.listen(3001, () => console.log("Servidor backend en puerto 3001"));
