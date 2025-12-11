import { db } from "./firebase.js";

export const updateOrderStatus = async (orderId, status) => {
    await db.collection("orders").doc(orderId).update({
        status: status,
        updatedAt: new Date(),
    });
};
