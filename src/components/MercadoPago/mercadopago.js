export const createPreference = async (cartItems, orderId) => {
    const res = await fetch("http://localhost:3001/mp/create_preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            items: cartItems,
            orderId: orderId,
        }),
    });

    return await res.json();
};
