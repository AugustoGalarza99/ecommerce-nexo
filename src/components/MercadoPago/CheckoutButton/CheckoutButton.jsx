import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { useEffect, useState } from "react";
import { createPreference } from "../api/mercadopago";

// ⚠️ ===> REEMPLAZA TU PUBLIC KEY TEST AQUÍ <===
initMercadoPago("APP_USR-6bd5f605-2093-496a-8236-d0428ceaef49", { locale: "es-AR" });

export default function CheckoutButton({ cart, orderId }) {
    const [preferenceId, setPreferenceId] = useState(null);

    const handleBuy = async () => {
        const pref = await createPreference(cart, orderId);
        setPreferenceId(pref.id);
    };

    return (
        <div>
            <button onClick={handleBuy} className="btn-comprar">
                Finalizar compra
            </button>

            {preferenceId && <Wallet initialization={{ preferenceId }} />}
        </div>
    );
}
