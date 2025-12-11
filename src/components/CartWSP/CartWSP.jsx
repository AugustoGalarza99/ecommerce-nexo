import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./CartWSP.css";

function Cart() {
  const { cart, clearCart, removeFromCart } = useCart();
  const navigate = useNavigate();

  // Calcular total
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Alertas personalizadas con SweetAlert2
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  // Generar mensaje para WhatsApp
  const handleCheckout = () => {
    if (cart.length === 0) return;

    const mensaje = encodeURIComponent(
      `¡Hola! Quiero comprar estos productos:\n\n` +
      cart
        .map((item) => `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`)
        .join("\n") +
      `\n\nTotal: $${total.toFixed(2)}`
    );

    const numeroWhatsApp = "5493572438785"; // Reemplaza con el número de WhatsApp de la tienda
    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, "_blank");

    clearCart();
  };

  // Eliminar producto del carrito
  const handleRemoveItem = (item) => {
    removeFromCart(item);
    Toast.fire({
      icon: "success",
      title: "Producto eliminado del carrito",
    });
  };

  if (cart.length === 0) {
    return (
      <div className="cart-container empty">
        <p>Tu carrito está vacío</p>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>Tu Carrito</h2>
      <ul className="cart-list">
        {cart.map((item, index) => (
          <li key={index} className="cart-item">
            <img src={item.imageUrl} alt={item.name} className="cart-img" />
            <div className="cart-details">
              <h3>{item.name}</h3>
              <p>${item.price.toFixed(2)} x {item.quantity}</p>
              <p className="total-item">Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <button onClick={() => handleRemoveItem(item)} className="remove-btn">✖</button>
          </li>
        ))}
      </ul>
      <div className="cart-summary">
        <h3>Total: ${total.toFixed(2)}</h3>
        <button onClick={handleCheckout} className="checkout-btn">Finalizar Compra por WhatsApp</button>
      </div>
    </div>
  );
}

export default Cart;
