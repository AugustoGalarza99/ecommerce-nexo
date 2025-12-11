// CategoriaModal.jsx
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Props:
 * - initial: { id?, name, parent? }  (parent = parentId or null)
 * - onClose: fn
 * - onSave: fn(payload) => payload: { id?, name, parent? }
 */
export default function CategoriaModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [parent, setParent] = useState(initial?.parent ?? null);

  useEffect(() => {
    setName(initial?.name || "");
    setParent(initial?.parent ?? null);
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: initial?.id || null, name: name.trim(), parent });
  };

  return (
    <div className="gc-modal-overlay">
      <div className="gc-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{initial?.id ? "Editar categoría" : parent ? "Nueva subcategoría" : "Nueva categoría"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <p style={{ color: "#666", marginTop: 8 }}>
          {initial?.id ? "Actualiza el nombre de la categoría." : parent ? "Crea una subcategoría dentro de la categoría seleccionada." : "Crea una nueva categoría raíz."}
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 700, color: "#2d1b4e" }}>Nombre</label>
          <input className="gc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Samsung / Ropa / Hogar..." autoFocus />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">{initial?.id ? "Guardar" : "Crear"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
