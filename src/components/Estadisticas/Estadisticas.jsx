// src/admin/AdminStats.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { TrendingUp, ShoppingCart, Users, DollarSign, BarChart3 } from "lucide-react";
import "./Estadisticas.css"

function Estadisticas() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0, avgOrder: 0 });

  useEffect(() => {
    const fetch = async () => {
      const ordersSnap = await getDocs(collection(db, "orders"));
      const usersSnap = await getDocs(collection(db, "users"));
      const orders = ordersSnap.docs.map(d => d.data());

      const revenue = orders.reduce((a, o) => a + o.total, 0);
      setStats({
        revenue,
        orders: orders.length,
        customers: usersSnap.size,
        avgOrder: orders.length ? revenue / orders.length : 0
      });
    };
    fetch();
  }, []);

  return (
    <div className="sta-page">
      <h1><BarChart3 size={36} /> Estadísticas</h1>
      <div className="sta-grid">
        <div className="sta-card purple"><DollarSign size={40} /> <span>${stats.revenue.toLocaleString("es-AR")}</span><small>Ingresos totales</small></div>
        <div className="sta-card blue"><ShoppingCart size={40} /> <span>{stats.orders}</span><small>Pedidos</small></div>
        <div className="sta-card green"><Users size={40} /> <span>{stats.customers}</span><small>Clientes</small></div>
        <div className="sta-card orange"><TrendingUp size={40} /> <span>${stats.avgOrder.toFixed(0)}</span><small>Ticket promedio</small></div>
      </div>
    </div>
  );
}

export default Estadisticas;