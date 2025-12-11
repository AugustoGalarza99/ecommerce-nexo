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
        // Convertir buffer a JSON
        const raw = req.body.toString();
        console.log("📩 Webhook recibido RAW:", raw);

        const notification = JSON.parse(raw);
        console.log("🔔 Webhook parseado:", notification);

        // Ignorar si no es pago
        if (notification.type !== "payment") {
            return res.sendStatus(200);
        }

        const paymentId = notification.data.id;

        // Obtener datos desde MercadoPago
        const response = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: {
                    Authorization: `Bearer ${client.accessToken}`,
                },
            }
        );

        const data = await response.json();
        console.log("🧾 Datos del pago:", data);

        // ❗ Ignorar pagos inexistentes (prueba con ID falso)
        if (data.error === "not_found") {
            console.log("⚠ Pago inexistente. Webhook de prueba ignorado.");
            return res.sendStatus(200);
        }

        // Guardar en Firestore SOLO si existen los campos
        await db.collection("orders").doc(String(paymentId)).set({
            id: paymentId,
            status: data.status ?? null,
            status_detail: data.status_detail ?? null,
            amount: data.transaction_amount ?? null,
            email: data.payer?.email ?? null,
            items: data.additional_info?.items ?? [],
            date: new Date(),
        });

        console.log("📦 Orden guardada en Firestore");

        return res.sendStatus(200);

    } catch (error) {
        console.error("❌ Error en webhook:", error);
        return res.sendStatus(500);
    }
};
