import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useCart } from "../../context/CartContext";
import { ShoppingCart, User, LogOut, Menu, X, Home, Package, Shield } from "lucide-react";
import logo from "../../../public/importado.png";
import "./Navbar.css";

function Navbar() {
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setRole(userDoc.exists() ? userDoc.data().role : "user");
      } else {
        setRole(null);
      }
    });

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ESPACIO RESERVADO PARA QUE EL BANNER NO SE SUPERPONGA AL BANNER */}
      <div className="navbar-spacer"></div>

      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="navbar-container">

          {/* HAMBURGUESA + LOGO PEQUEÑO (móvil) */}
          <div className="mobile-left">
            <button
              className={`hamburger ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="line"></span>
              <span className="line"></span>
              <span className="line"></span>
            </button>

            <Link to="/" className="logo-mobile" onClick={() => setMenuOpen(false)}>
              <img src={logo} alt="Logo" />
            </Link>
          </div>

          {/* LOGO GRANDE (solo desktop) */}
          <Link to="/" className="logo-desktop" onClick={() => setMenuOpen(false)}>
            <img src={logo} alt="Logo" />
            <span>NexoLab</span>
          </Link>

          {/* MENÚ DESKTOP */}
          <ul className="nav-menu">
            <li><Link to="/" className="nav-link"><Home size={18} /> Inicio</Link></li>
            <li><Link to="/productos" className="nav-link"><Package size={18} /> Productos</Link></li>
            <li className="cart-item">
              <Link to="/cart" className="nav-link">
                <ShoppingCart size={18} /> Carrito
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
            </li>

            {role === "admin" && (
              <li>
                <Link to="/admin" className="nav-link admin">
                  <Shield size={18} /> Panel Admin
                </Link>
              </li>
            )}

            <li className="auth-buttons">
              {role ? (
                <>
                  <Link to="/perfil" className="nav-link"><User size={18} /> Perfil</Link>
                  <button onClick={() => auth.signOut()} className="nav-link logout">
                    <LogOut size={18} /> Salir
                  </button>
                </>
              ) : (
                <Link to="/login" className="nav-link login-btn">Iniciar Sesión</Link>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* MENÚ MÓVIL */}
      <div className={`mobile-overlay ${menuOpen ? "active" : ""}`} onClick={() => setMenuOpen(false)}></div>
      <div className={`mobile-menu ${menuOpen ? "active" : ""}`}>
        <div className="mobile-header">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <img src={logo} alt="Logo" className="mobile-logo-img" />
          </Link>
          <button onClick={() => setMenuOpen(false)} className="close-btn">
            <X size={28} />
          </button>
        </div>

        <div className="mobile-links">
          <Link to="/" onClick={() => setMenuOpen(false)}><Home size={22} /> Inicio</Link>
          <Link to="/productos" onClick={() => setMenuOpen(false)}><Package size={22} /> Productos</Link>
          <Link to="/cart" onClick={() => setMenuOpen(false)}>
            <ShoppingCart size={22} /> Carrito ({cartCount})
          </Link>

          {role === "admin" && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="admin-link-mobile">
              <Shield size={22} /> Panel de Administración
            </Link>
          )}
        </div>

        {/* BOTONES HORIZONTALES AL FINAL */}
        <div className="mobile-footer-actions">
          {role ? (
            <>
              <Link to="/perfil" onClick={() => setMenuOpen(false)} className="btn-profile">
                <User size={20} /> Mi Perfil
              </Link>
              <button onClick={() => { auth.signOut(); setMenuOpen(false); }} className="btn-logout">
                <LogOut size={20} /> Cerrar Sesión
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-login">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export default Navbar;