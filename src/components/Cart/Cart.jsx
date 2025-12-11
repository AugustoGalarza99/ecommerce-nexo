import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useState } from "react";
import "./Cart.css";

function Cart() {
  const { cart, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handlePay = async () => {
    if (cart.length === 0) return;

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/mp/create_preference", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ items: cart }),
});


      const data = await response.json(); // <-- acá falla cuando backend devuelve HTML

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        Swal.fire("Error", "No se pudo iniciar el pago", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo conectar con el servidor", "error");
    }

    setLoading(false);
  };

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Tu carrito está vacío</h2>
        <button onClick={() => navigate("/store")} className="btn-primary">
          Ver productos
        </button>
      </div>
    );
  }

  return (
    <div className="cart-wrapper">
      <h1 className="cart-title">Tu Carrito</h1>

      <div className="cart-grid">
        {/* LISTA DE PRODUCTOS */}
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-card">
              <img src={item.imageUrl} className="cart-img" alt={item.name} />

              <div className="cart-info">
                <h3>{item.name}</h3>
                <p>${item.price.toFixed(2)} x {item.quantity}</p>
                <p className="subtotal">Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
              </div>

              <button className="remove-btn" onClick={() => removeFromCart(item)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>

        {/* RESUMEN */}
        <div className="cart-summary">
          <h2>Resumen</h2>
          <p className="summary-total">
            Total: <span>${total.toFixed(2)}</span>
          </p>

          <button
            className="btn-pay"
            onClick={handlePay}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Pagar con Mercado Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Cart;
