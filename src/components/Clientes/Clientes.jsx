// src/admin/AdminCustomers.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Users, Mail, Calendar, DollarSign, Package } from "lucide-react";
import "./Clientes.css"

function Clientes() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const ordersSnap = await getDocs(collection(db, "orders"));
      const orders = ordersSnap.docs.map(d => d.data());

      const users = usersSnap.docs.map(doc => {
        const data = doc.data();
        const userOrders = orders.filter(o => o.userEmail === data.email);
        return {
          ...data,
          totalSpent: userOrders.reduce((a, o) => a + o.total, 0),
          orderCount: userOrders.length,
          lastOrder: userOrders.sort((a,b) => b.createdAt - a.createdAt)[0]?.createdAt
        };
      });
      setCustomers(users.sort((a,b) => b.totalSpent - a.totalSpent));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="cus-page">
      <h1><Users size={36} /> Clientes ({customers.length})</h1>
      <div className="cus-grid">
        {loading ? [...Array(8)].map((_,i) => <div key={i} className="cus-card skeleton"/>) :
          customers.map((c, i) => (
            <div key={i} className="cus-card">
              <div className="cus-avatar">{c.name?.[0] || c.email[0]}</div>
              <h3>{c.name || "Sin nombre"}</h3>
              <p><Mail size={16} /> {c.email}</p>
              <div className="cus-stats">
                <div><DollarSign size={18} /> ${c.totalSpent.toLocaleString("es-AR")}</div>
                <div><Package size={18} /> {c.orderCount} pedidos</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default Clientes;