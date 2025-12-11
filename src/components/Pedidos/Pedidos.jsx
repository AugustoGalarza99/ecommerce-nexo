// src/admin/AdminOrders.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Package, Truck, CheckCircle, XCircle, Clock, Search, ShoppingCart } from "lucide-react";
import "./Pedidos.css";

const statusColors = {
  pendiente: "#ff9800",
  enviado: "#2196f3",
  entregado: "#4caf50",
  cancelado: "#f44336"
};

function Pedidos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      const snap = await getDocs(collection(db, "orders"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const filtered = orders.filter(o =>
    o.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
    o.id.includes(search)
  );

  return (
    <div className="ord-page">
      <div className="ord-header">
        <h1><ShoppingCart size={36} /> Pedidos</h1>
        <div className="ord-search">
          <Search size={20} />
          <input placeholder="Buscar por email o ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="ord-grid">
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="ord-card skeleton"><div className="ord-skel"></div></div>
        )) : filtered.map(order => (
          <div key={order.id} className="ord-card">
            <div className="ord-top">
              <span className="ord-id">#{order.id.slice(0, 8)}</span>
              <span className="ord-date">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString("es-AR")}</span>
            </div>
            <p className="ord-user">{order.userEmail}</p>
            <p className="ord-total">${order.total.toLocaleString("es-AR")}</p>
            <div className="ord-items">
              {order.items.map((it, i) => (
                <div key={i}><Package size={14} /> {it.name} ×{it.quantity}</div>
              ))}
            </div>
            <div className="ord-status" style={{ backgroundColor: statusColors[order.status] + "20", color: statusColors[order.status] }}>
              {order.status}
            </div>
            <div className="ord-actions">
              <button onClick={() => updateStatus(order.id, "enviado")} disabled={order.status !== "pendiente"}><Truck size={18} /> Enviar</button>
              <button onClick={() => updateStatus(order.id, "entregado")} disabled={order.status !== "enviado"}><CheckCircle size={18} /> Entregado</button>
              <button onClick={() => updateStatus(order.id, "cancelado")}><XCircle size={18} /> Cancelar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pedidos;