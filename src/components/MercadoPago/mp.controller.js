import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "./firebase.js"; // Asegurate que este archivo existe y exporta db

// ⚠️ Cambiá este token por el que te dé tu cliente luego
const client = new MercadoPagoConfig({
    accessToken: "APP_USR-8834239301456347-120721-85726057d373d1aef932756e6c0fd75b-2572906655"
});

// =============================
// 📌 Crear Preferencia
// =============================
export const createPreference = async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: "Items inválidos" });
        }

        const preference = new Preference(client);

        const body = {
            items: items.map((i) => ({
                title: i.name,
                quantity: i.quantity,
                unit_price: Number(i.price),
            })),

            additional_info: {
                items: items.map(i => ({
                    id: i.id,
                    title: i.name,
                    quantity: i.quantity,
                    unit_price: Number(i.price)
                }))
            },

            back_urls: {
                success: "http://localhost:5173/success",
                failure: "http://localhost:5173/failure",
                pending: "http://localhost:5173/pending",
            },

            notification_url: "https://397cf2c8b523.ngrok-free.app/mp/webhook", // 👈 MUY IMPORTANTE

            //auto_return: "approved",
        };

        const result = await preference.create({ body });

        return res.json({
            id: result.id,
            init_point: result.init_point,
        });

    } catch (error) {
        console.error("Error creando preferencia:", error);
        return res.status(500).json({ error: "Error creando preferencia" });
    }
};


// =============================
// 📌 WEBHOOK — Registro del Pedido en Firestore
// =============================
export const webhook = async (req, res) => {
    try {
        // Convertimos el RAW BODY a JSON
        const raw = req.body.toString();
        console.log("📩 Webhook recibido RAW:", raw);

        const notification = JSON.parse(raw);
        console.log("🔔 Webhook parseado:", notification);

        // Si NO es evento de pago → ignorar
        if (notification.type !== "payment") {
            console.log("⏭ Evento ignorado:", notification.type);
            return res.sendStatus(200);
        }

        const paymentId = notification.data.id;

        // --- Obtener pago desde MercadoPago ---
        const response = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: {
                    Authorization: `Bearer ${client.accessToken}`,
                    "Content-Type": "application/json"
                },
            }
        );

        const data = await response.json();
        console.log("🧾 Datos del pago:", data);

        // Si Mercado Pago dice que el pago no existe → ignoramos
        if (data.error === "not_found") {
            console.log("⚠ Pago inexistente, ignorando webhook.");
            return res.sendStatus(200);
        }

        // ==========================================
        // 🔥 MAPEO PROFESIONAL DE LA ORDEN
        // ==========================================

        const orderDoc = {
            id: String(paymentId),

            // 📌 Estado estándar para el administrador
            status:
                data.status === "approved"
                    ? "pagado"
                    : data.status === "pending"
                    ? "pendiente_pago"
                    : data.status === "in_process"
                    ? "en_revision"
                    : data.status === "rejected"
                    ? "cancelado"
                    : data.status || "pendiente_pago",

            status_detail: data.status_detail || "",

            // 📦 Monto total
            amount: data.transaction_amount || 0,

            // 👤 Datos del comprador
            email: data.payer?.email || "",
            payer_name: `${data.payer?.first_name || ""} ${data.payer?.last_name || ""}`.trim(),
            phone: data.payer?.phone?.number || "",

            // 💳 Método de pago
            payment_method: data.payment_method?.type || "",
            payment_type: data.payment_type_id || "",

            // 🛒 Items detallados
            items: (data.additional_info?.items || []).map(i => ({
                title: i.title,
                quantity: Number(i.quantity),
                unit_price: Number(i.unit_price),
            })),

            // 🕒 Fecha del pago real
            date: new Date(data.date_approved || Date.now()),
            lastUpdate: new Date(),
        };

        // ==========================================
        // 🔥 GUARDAR / ACTUALIZAR EN FIRESTORE
        // ==========================================
        await db.collection("orders").doc(String(paymentId)).set(orderDoc, { merge: true });

        console.log("📦 Orden guardada correctamente en Firestore.");

        return res.sendStatus(200);

    } catch (error) {
        console.error("❌ Error en webhook:", error);
        return res.sendStatus(500);
    }
};
