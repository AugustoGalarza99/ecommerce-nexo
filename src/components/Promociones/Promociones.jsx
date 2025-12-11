// src/admin/AdminPromotions.jsx
import React, { useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import "./Promociones.css"

function Promociones() {
  const [coupons, setCoupons] = useState([]);
  const [newCode, setNewCode] = useState({ code: "", discount: "", type: "percent", uses: "" });

  const createCoupon = async () => {
    if (!newCode.code || !newCode.discount) return;
    const coupon = {
      ...newCode,
      discount: parseFloat(newCode.discount),
      uses: parseInt(newCode.uses) || null,
      createdAt: new Date()
    };
    const ref = await addDoc(collection(db, "coupons"), coupon);
    setCoupons(prev => [...prev, { id: ref.id, ...coupon }]);
    setNewCode({ code: "", discount: "", type: "percent", uses: "" });
  };

  const remove = async (id) => {
    await deleteDoc(doc(db, "coupons", id));
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="pro-page">
      <h1><Megaphone size={36} /> Promociones y Cupones</h1>
      <div className="pro-form">
        <input placeholder="Código (ej: BIENV10)" value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})} />
        <input type="number" placeholder="Descuento" value={newCode.discount} onChange={e => setNewCode({...newCode, discount: e.target.value})} />
        <select value={newCode.type} onChange={e => setNewCode({...newCode, type: e.target.value})}>
          <option value="percent">%</option>
          <option value="fixed">$ fijo</option>
        </select>
        <input type="number" placeholder="Usos máximos (opcional)" value={newCode.uses} onChange={e => setNewCode({...newCode, uses: e.target.value})} />
        <button onClick={createCoupon}><Plus size={20} /> Crear Cupón</button>
      </div>
      <div className="pro-list">
        {coupons.map(c => (
          <div key={c.id} className="pro-coupon">
            <strong>{c.code}</strong> → {c.type === "percent" ? `${c.discount}%` : `$${c.discount}`} OFF
            <button onClick={() => remove(c.id)}><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Promociones;