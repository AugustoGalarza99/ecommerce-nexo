// CategoriaCard.jsx
import React, { useState } from "react";
import { Tag, Edit, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";

/**
 * Props:
 * - category: { id, name, parent }
 * - children: array of immediate children
 * - onCreateSub: () => void
 * - onEdit: () => void
 * - onDelete: () => void  (for this category)
 * - onOpenChildEdit: (child) => void
 * - childList: (parentId) => array (fn to get children when expanding)
 */
export default function CategoriaCard({ category, children = [], onCreateSub, onEdit, onDelete, onOpenChildEdit, childList }) {
  const [open, setOpen] = useState(false);
  const kids = childList ? childList(category.id) : children;

  return (
    <div className="cat-card">
      <div className="cat-card-left">
        <div className="cat-avatar"><Tag size={18} /></div>
        <div>
          <div className="cat-title">{category.name}</div>
          <div className="cat-sub">ID: {category.id}</div>
        </div>
      </div>

      <div className="cat-actions">
        <button className="icon-btn" onClick={() => { setOpen((s) => !s); }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <button className="btn-small" onClick={onCreateSub}><Plus size={14} /> Sub</button>
        <button className="icon-btn" onClick={onEdit}><Edit size={16} /></button>
        <button className="icon-btn danger" onClick={onDelete}><Trash2 size={16} /></button>
      </div>

      {open && (
        <div className="cat-children">
          {kids.length === 0 ? (
            <div className="cat-child-empty">Sin subcategorías</div>
          ) : (
            kids.map((kid) => (
              <div key={kid.id} className="cat-child-row">
                <div className="cat-child-left">
                  <div className="cat-avatar small"><Tag size={14} /></div>
                  <div>
                    <div className="cat-child-title">{kid.name}</div>
                    <div className="cat-child-sub">ID: {kid.id}</div>
                  </div>
                </div>

                <div className="cat-child-actions">
                  <button className="btn-link" onClick={() => onOpenChildEdit && onOpenChildEdit(kid)}>Editar</button>
                  <button className="btn-link danger" onClick={() => onDelete && onDelete(kid)}>Eliminar</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
