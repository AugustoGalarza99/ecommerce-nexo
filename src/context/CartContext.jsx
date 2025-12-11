import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig"; 
import { doc, setDoc, getDoc } from "firebase/firestore";

// Crear y exportar el contexto
export const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    // Intentar recuperar el carrito del localStorage
    const localCart = localStorage.getItem("cart");
    return localCart ? JSON.parse(localCart) : [];
  });

  useEffect(() => {
    const loadCart = async () => {
      if (auth.currentUser) {
        const cartDoc = doc(db, "carts", auth.currentUser.uid);
        const docSnap = await getDoc(cartDoc);
        if (docSnap.exists()) {
          const savedCart = docSnap.data().items || [];
          setCart(savedCart);
          localStorage.setItem("cart", JSON.stringify(savedCart)); // Guardar en localStorage
        }
      }
    };
    loadCart();
  }, []);

  useEffect(() => {
    // Guardar en localStorage cada vez que el carrito cambie
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = async (item) => {
    const newCart = [...cart, item];
    setCart(newCart);
    
    if (auth.currentUser) {
      await setDoc(doc(db, "carts", auth.currentUser.uid), { items: newCart }, { merge: true });
    }
  };

  const clearCart = async () => {
    setCart([]);
    localStorage.removeItem("cart");

    if (auth.currentUser) {
      await setDoc(doc(db, "carts", auth.currentUser.uid), { items: [] }, { merge: true });
    }
  };

  const removeFromCart = async (itemToRemove) => {
    const newCart = cart.filter((item) => item.name !== itemToRemove.name);
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));

    if (auth.currentUser) {
      await setDoc(doc(db, "carts", auth.currentUser.uid), { items: newCart }, { merge: true });
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, clearCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
