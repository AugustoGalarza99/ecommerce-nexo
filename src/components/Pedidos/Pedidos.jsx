// src/admin/Pedidos.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";

import {
  Search,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart
} from "lucide-react";

import "./Pedidos.css";

const statusLabels = {
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const statusColors = {
  pendiente_pago: "#ff9800",
  pagado: "#1976d2",
  en_preparacion: "#9c27b0",
  enviado: "#2196f3",
  entregado: "#4caf50",
  cancelado: "#f44336",
};

const PAGE_SIZE = 20;

export default function Pedidos() {
  const [orders, setOrders] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // -------------------------------------------------
  // 🔥 CARGA INICIAL + PAGINACIÓN
  // -------------------------------------------------
  const loadOrders = async (next = false) => {
    setLoading(true);

    const ref = collection(db, "orders");
    let q = query(ref, orderBy("date", "desc"), limit(PAGE_SIZE));

    if (next && lastDoc) {
      q = query(ref, orderBy("date", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
    }

    const snap = await getDocs(q);

    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    setLastDoc(snap.docs[snap.docs.length - 1]);
    setOrders(prev => next ? [...prev, ...data] : data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // -------------------------------------------------
  // 🔥 CAMBIAR ESTADO DEL PEDIDO
  // -------------------------------------------------
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "orders", id), {
      status,
      lastUpdate: new Date()
    });

    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, status } : o))
    );
  };

  // -------------------------------------------------
  // 🔥 FILTRO LOCAL — NO CONSUME FIREBASE
  // -------------------------------------------------
  const filtered = orders.filter(o =>
    (o.payer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.phone || "").includes(search) ||
    o.id.includes(search)
  );

  return (
    <div className="pedidos-page">

      {/* HEADER */}
      <div className="pedidos-header">
        <h1><ShoppingCart size={32} /> Pedidos</h1>

        <div className="pedidos-search">
          <Search size={20} />
          <input
            placeholder="Buscar por nombre, teléfono o ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* PANEL SUPERIOR */}
      <div className="pedidos-stats">
        <div className="stat-card">Pendientes: <b>{orders.filter(o => o.status === "pendiente_pago").length}</b></div>
        <div className="stat-card">Pagados: <b>{orders.filter(o => o.status === "pagado").length}</b></div>
        <div className="stat-card">En preparación: <b>{orders.filter(o => o.status === "en_preparacion").length}</b></div>
        <div className="stat-card">Enviados: <b>{orders.filter(o => o.status === "enviado").length}</b></div>
      </div>

      {/* TABLA (ESCRITORIO) */}
      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Productos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(order => (
              <tr key={order.id}>
                <td>#{order.id.slice(0, 8)}</td>
                <td>{order.payer_name}</td>
                <td>{order.phone}</td>

                <td className="products-col">
                  {order.items?.map(it => (
                    <span key={it.title} className="product-pill">
                      {it.title} × {it.quantity}
                    </span>
                  ))}
                </td>

                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: statusColors[order.status] + "20",
                      color: statusColors[order.status]
                    }}
                  >
                    {statusLabels[order.status]}
                  </span>
                </td>

                <td className="actions-col">
                  {order.status === "pagado" && (
                    <button onClick={() => updateStatus(order.id, "en_preparacion")}>
                      <Clock size={16} /> Preparar
                    </button>
                  )}
                  {order.status === "en_preparacion" && (
                    <button onClick={() => updateStatus(order.id, "enviado")}>
                      <Truck size={16} /> Enviar
                    </button>
                  )}
                  {order.status === "enviado" && (
                    <button onClick={() => updateStatus(order.id, "entregado")}>
                      <CheckCircle size={16} /> Entregar
                    </button>
                  )}
                  {order.status !== "cancelado" && order.status !== "entregado" && (
                    <button className="cancel" onClick={() => updateStatus(order.id, "cancelado")}>
                      <XCircle size={16} /> Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <p className="loading">Cargando…</p>}
      </div>

      {/* BOTÓN DE CARGAR MÁS */}
      {lastDoc && (
        <button className="load-more" onClick={() => loadOrders(true)}>
          Cargar más
        </button>
      )}

      {/* CARDS MOBILE */}
      <div className="orders-cards">
        {filtered.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-head">
              <span className="order-id">#{order.id.slice(0, 8)}</span>
              <span className="order-date">
                {new Date(order.date?.seconds * 1000).toLocaleDateString("es-AR")}
              </span>
            </div>

            <p className="order-client"><b>{order.payer_name}</b></p>
            <p className="order-phone">{order.phone}</p>

            <div className="order-items">
              {order.items?.map(it => (
                <div key={it.title}><Package size={14}/> {it.title} × {it.quantity}</div>
              ))}
            </div>

            <div
              className="status-badge"
              style={{
                backgroundColor: statusColors[order.status] + "20",
                color: statusColors[order.status]
              }}
            >
              {statusLabels[order.status]}
            </div>

            <div className="card-actions">
              {order.status === "pagado" && (
                <button onClick={() => updateStatus(order.id, "en_preparacion")}>
                  <Clock size={16}/> Preparar
                </button>
              )}
              {order.status === "en_preparacion" && (
                <button onClick={() => updateStatus(order.id, "enviado")}>
                  <Truck size={16}/> Enviar
                </button>
              )}
              {order.status === "enviado" && (
                <button onClick={() => updateStatus(order.id, "entregado")}>
                  <CheckCircle size={16}/> Entregar
                </button>
              )}
              {order.status !== "cancelado" && order.status !== "entregado" && (
                <button className="cancel" onClick={() => updateStatus(order.id, "cancelado")}>
                  <XCircle size={16}/> Cancelar
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
