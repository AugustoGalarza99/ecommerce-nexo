import React from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  Image, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  Palette,
  Megaphone,
  ArrowRight
} from "lucide-react";
import "./Administracion.css";

const adminLinks = [
  { title: "Productos", icon: <Package />, to: "/admin/productos", color: "#6c5ce7" },
  { title: "Banners", icon: <Image />, to: "/admin/fotosbanner", color: "#e91e63" },
  { title: "Pedidos", icon: <ShoppingCart />, to: "/admin/pedidos", color: "#00bcd4" },
  { title: "Clientes", icon: <Users />, to: "/admin/clientes", color: "#4caf50" },
  { title: "Estadísticas", icon: <BarChart3 />, to: "/admin/estadisticas", color: "#ff9800" },
  { title: "Promociones", icon: <Megaphone />, to: "/admin/promociones", color: "#e91e63" },
  { title: "Apariencia", icon: <Palette />, to: "/admin/theme", color: "#9c27b0" },
  { title: "Configuración", icon: <Settings />, to: "/admin/settings", color: "#607d8b" },
];

function AdminDashboard() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Panel de Administración</h1>
          <p className="dashboard-subtitle">Gestioná tu tienda con total control</p>
        </header>

        <div className="cards-grid">
          {adminLinks.map((link, index) => (
            <Link
              key={index}
              to={link.to}
              className="card-link"
              style={{ "--card-color": link.color, "--delay": `${index * 0.08}s` }}
            >
              <div className="admin-card">
                <div className="card-bg"></div>
                <div className="card-content">
                  <div className="card-icon" style={{ backgroundColor: link.color + "20" }}>
                    {React.cloneElement(link.icon, { size: 28, strokeWidth: 2 })}
                  </div>
                  <h3 className="card-title">{link.title}</h3>
                  <p className="card-desc">Administrar {link.title.toLowerCase()}</p>
                  <ArrowRight className="card-arrow" size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <footer className="dashboard-footer">
          <p>© {new Date().getFullYear()} • Tu Tienda • Hecho con amor y React</p>
        </footer>
      </div>
    </>
  );
}

export default AdminDashboard;