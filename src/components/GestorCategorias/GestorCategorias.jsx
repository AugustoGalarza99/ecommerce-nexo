import React, { useEffect, useState } from "react";
import "./GestorCategorias.css";
import { db } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  orderBy,
  query,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  Tag,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

/**
 * GestorCategorias.jsx
 * - Trabaja sobre la colección "categories" en Firestore
 * - Soporta: crear categoría, editar, eliminar (cascade optional),
 *   subcategorías (array en cada doc), edición/elim. de subcategorías.
 * - Usa localStorage con TTL para minimizar lecturas a Firestore.
 * - Visual: glassmorphism sutil / paleta púrpura (coherente con la tienda).
 */

/* ---------- Config cache (localStorage) ---------- */
const CACHE_KEY = "gestor_categories_cache_v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const nowTs = () => new Date().getTime();
const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.data) return null;
    if (nowTs() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch (err) {
    console.warn("loadCache error", err);
    return null;
  }
};
const saveCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: nowTs(), data }));
  } catch (err) {
    console.warn("saveCache error", err);
  }
};

/* ---------- Component ---------- */
export default function GestorCategorias() {
  const navigate = useNavigate();

  // Data
  const [categories, setCategories] = useState([]); // flat list from firestore
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState(null); // { id, name }
  const [newSubByCat, setNewSubByCat] = useState({}); // { [catId]: "valor" }
  const [editingSub, setEditingSub] = useState({}); // { "<catId>|<subIndex>": name }

  // UI states
  const [expanded, setExpanded] = useState({}); // show subcategories by catId
  const [toasts, setToasts] = useState([]); // { id, message, type }
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm }

  useEffect(() => {
    fetchCategories(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Toast helpers ---------- */
  const pushToast = (message, type = "success", ttl = 3200) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  };

  /* ---------- Confirm modal ---------- */
  const openConfirm = ({ title = "Confirmar", message = "", onConfirm }) => {
    setConfirm({ title, message, onConfirm });
  };
  const closeConfirm = () => setConfirm(null);

  /* ---------- Fetch categories (cache-friendly) ---------- */
  const fetchCategories = async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const cached = loadCache();
        if (cached) {
          setCategories(cached);
          setLoading(false);
          return;
        }
      }

      const q = query(collection(db, "categories"), orderBy("name", "asc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(list);
      saveCache(list);
    } catch (err) {
      console.error("fetchCategories:", err);
      pushToast("Error cargando categorías", "error");
    } finally {
      setLoading(false);
    }
  };

  const forceReload = async () => {
    await fetchCategories(true);
    pushToast("Categorías recargadas", "info");
  };

  /* ---------- Create category ---------- */
  const handleCreateCategory = async () => {
    const name = (newCatName || "").trim();
    if (!name) {
      pushToast("El nombre no puede estar vacío", "error");
      return;
    }

    openConfirm({
      title: "Crear categoría",
      message: `Crear "${name}"?`,
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          const ref = await addDoc(collection(db, "categories"), {
            name,
            parent: null,
            subcategories: [],
            createdAt: nowTs(),
          });
          const created = { id: ref.id, name, parent: null, subcategories: [] };
          const updated = [...categories, created].sort((a, b) => a.name.localeCompare(b.name));
          setCategories(updated);
          saveCache(updated);
          setNewCatName("");
          pushToast("Categoría creada", "success");
        } catch (err) {
          console.error("createCategory:", err);
          pushToast("Error creando categoría", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /* ---------- Edit category ---------- */
  const handleStartEditCategory = (cat) => {
    setEditingCat({ id: cat.id, name: cat.name });
  };

  const handleCancelEditCategory = () => setEditingCat(null);

  const handleSaveEditCategory = async () => {
    if (!editingCat?.name?.trim()) {
      pushToast("El nombre no puede estar vacío", "error");
      return;
    }
    openConfirm({
      title: "Guardar cambios",
      message: `Guardar cambios en "${editingCat.name}"?`,
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          const ref = doc(db, "categories", editingCat.id);
          await updateDoc(ref, { name: editingCat.name });
          const updated = categories.map((c) => (c.id === editingCat.id ? { ...c, name: editingCat.name } : c));
          setCategories(updated);
          saveCache(updated);
          setEditingCat(null);
          pushToast("Categoría actualizada", "success");
        } catch (err) {
          console.error("saveEditCategory:", err);
          pushToast("Error actualizando categoría", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /* ---------- Subcategories: add / edit / delete ---------- */
  const handleToggleExpand = (catId) => {
    setExpanded((s) => ({ ...s, [catId]: !s[catId] }));
  };

  const handleChangeNewSub = (catId, value) => {
    setNewSubByCat((s) => ({ ...s, [catId]: value }));
  };

  const handleAddSub = (catId) => {
    const text = (newSubByCat[catId] || "").trim();
    if (!text) {
      pushToast("La subcategoría no puede estar vacía", "error");
      return;
    }

    openConfirm({
      title: "Agregar subcategoría",
      message: `Agregar "${text}" a la categoría?`,
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          const cat = categories.find((c) => c.id === catId);
          const newSubs = Array.isArray(cat.subcategories) ? [...cat.subcategories, text] : [text];
          await updateDoc(doc(db, "categories", catId), { subcategories: newSubs });
          const updated = categories.map((c) => (c.id === catId ? { ...c, subcategories: newSubs } : c));
          setCategories(updated);
          saveCache(updated);
          setNewSubByCat((s) => ({ ...s, [catId]: "" }));
          pushToast("Subcategoría agregada", "success");
          setExpanded((s) => ({ ...s, [catId]: true }));
        } catch (err) {
          console.error("addSub:", err);
          pushToast("Error agregando subcategoría", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const keyForEditingSub = (catId, idx) => `${catId}|${idx}`;

  const handleStartEditSub = (catId, idx, value) => {
    setEditingSub((s) => ({ ...s, [keyForEditingSub(catId, idx)]: value }));
  };

  const handleCancelEditSub = (catId, idx) => {
    setEditingSub((s) => {
      const copy = { ...s };
      delete copy[keyForEditingSub(catId, idx)];
      return copy;
    });
  };

  const handleSaveEditSub = (catId, idx) => {
    const key = keyForEditingSub(catId, idx);
    const newName = (editingSub[key] || "").trim();
    if (!newName) {
      pushToast("El nombre no puede estar vacío", "error");
      return;
    }

    openConfirm({
      title: "Guardar subcategoría",
      message: `Guardar cambios en "${newName}"?`,
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          const cat = categories.find((c) => c.id === catId);
          const subs = Array.isArray(cat.subcategories) ? [...cat.subcategories] : [];
          subs[idx] = newName;
          await updateDoc(doc(db, "categories", catId), { subcategories: subs });
          const updated = categories.map((c) => (c.id === catId ? { ...c, subcategories: subs } : c));
          setCategories(updated);
          saveCache(updated);
          handleCancelEditSub(catId, idx);
          pushToast("Subcategoría actualizada", "success");
        } catch (err) {
          console.error("saveEditSub:", err);
          pushToast("Error actualizando subcategoría", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeleteSub = (catId, subName) => {
    openConfirm({
      title: "Eliminar subcategoría",
      message: `Eliminar "${subName}"?`,
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          const cat = categories.find((c) => c.id === catId);
          const subs = (cat.subcategories || []).filter((s) => s !== subName);
          await updateDoc(doc(db, "categories", catId), { subcategories: subs });
          const updated = categories.map((c) => (c.id === catId ? { ...c, subcategories: subs } : c));
          setCategories(updated);
          saveCache(updated);
          pushToast("Subcategoría eliminada", "success");
        } catch (err) {
          console.error("deleteSub:", err);
          pushToast("Error eliminando subcategoría", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /* ---------- Delete category (cascade optional) ---------- */
  const handleDeleteCategory = (cat) => {
    // find all descendants (just in case, but here we only have one level subcategories stored in array)
    const hasSub = Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
    const message = hasSub
      ? `La categoría "${cat.name}" tiene subcategorías. ¿Eliminarla igualmente? Se eliminarán los documentos y sus subcategorías.`
      : `Eliminar la categoría "${cat.name}"?`;

    openConfirm({
      title: "Eliminar categoría",
      message,
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          // If cascade: delete doc. (since subcategories are stored inside doc, single delete is enough)
          await deleteDoc(doc(db, "categories", cat.id));
          const updated = categories.filter((c) => c.id !== cat.id);
          setCategories(updated);
          saveCache(updated);
          pushToast("Categoría eliminada", "success");
        } catch (err) {
          console.error("deleteCategory:", err);
          pushToast("Error eliminando categoría", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /* ---------- UTILS ---------- */
  const renderSubItem = (cat, sub, idx) => {
    const key = keyForEditingSub(cat.id, idx);
    const editingValue = editingSub[key];

    return (
      <div className="gc-sub-row" key={key}>
        <div className="gc-sub-left">
          <div className="gc-sub-bullet" />
          {editingValue !== undefined ? (
            <input
              className="gc-sub-edit-input"
              value={editingValue}
              onChange={(e) => setEditingSub((s) => ({ ...s, [key]: e.target.value }))}
            />
          ) : (
            <div className="gc-sub-name">{sub}</div>
          )}
        </div>

        <div className="gc-sub-actions">
          {editingValue !== undefined ? (
            <>
              <button className="gc-btn gc-btn-ghost" onClick={() => handleSaveEditSub(cat.id, idx)}>
                Guardar
              </button>
              <button className="gc-btn gc-btn-ghost" onClick={() => handleCancelEditSub(cat.id, idx)}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button className="icon-btn" onClick={() => handleStartEditSub(cat.id, idx, sub)}>
                <Edit size={14} />
              </button>
              <button className="icon-btn danger" onClick={() => handleDeleteSub(cat.id, sub)}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ---------- Render ---------- */
  return (
    <>
      <div className="gc-container">
        <div className="gc-card">
          <div className="gc-header">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button className="back-button" onClick={() => navigate("/admin/productos")} title="Volver">
                <ChevronLeftIcon />
              </button>
              <h2 className="gc-title"><Tag className="gc-title-icon" /> Gestor de Categorías</h2>
            </div>
            <p className="gc-sub">Organiza categorías y subcategorías</p>
          </div>

          <div className="gc-actions">
            <div className="gc-new-form">
              <input
                className="gc-input"
                placeholder="Nueva categoría (ej: Celulares)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button className="btn-primary" onClick={handleCreateCategory}><Plus size={16} /> Crear</button>
              <button className="btn-secondary" onClick={forceReload} title="Recargar categorías">Recargar</button>
            </div>
          </div>

          <div className="gc-body">
            {loading ? (
              <div className="gc-loading">Cargando categorías…</div>
            ) : categories.length === 0 ? (
              <div className="gc-empty">
                <Tag size={48} />
                <h3>No hay categorías</h3>
                <p>Crea tu primera categoría raíz</p>
              </div>
            ) : (
              <div className="gc-grid">
                {categories.map((cat) => (
                  <div className="gc-card-cat" key={cat.id}>
                    <div className="gc-card-top">
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div className="gc-avatar"><Tag size={18} /></div>
                        <div>
                          {editingCat?.id === cat.id ? (
                            <input className="gc-edit-input" value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} />
                          ) : (
                            <div className="gc-cat-name">{cat.name}</div>
                          )}
                          <div className="gc-cat-id">ID: {cat.id}</div>
                        </div>
                      </div>

                      <div className="gc-card-actions">
                        {editingCat?.id === cat.id ? (
                          <>
                            <button className="btn-primary small" onClick={handleSaveEditCategory}>Guardar</button>
                            <button className="btn-secondary small" onClick={handleCancelEditCategory}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="icon-btn" onClick={() => handleStartEditCategory(cat)} title="Editar"><Edit size={14} /></button>
                            <button className="icon-btn danger" onClick={() => handleDeleteCategory(cat)} title="Eliminar"><Trash2 size={14} /></button>
                          </>
                        )}
                        <button className="icon-toggle" onClick={() => handleToggleExpand(cat.id)} title="Mostrar subcategorías">
                          {expanded[cat.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </div>
                    </div>

                    {expanded[cat.id] && (
                      <div className="gc-subsection">
                        <div className="gc-sub-list">
                          {(cat.subcategories || []).length === 0 ? (
                            <div className="gc-sub-empty">Sin subcategorías</div>
                          ) : (
                            (cat.subcategories || []).map((sub, idx) => renderSubItem(cat, sub, idx))
                          )}
                        </div>

                        <div className="gc-sub-add">
                          <input
                            className="gc-input"
                            placeholder="Agregar subcategoría (ej: Samsung)"
                            value={newSubByCat[cat.id] || ""}
                            onChange={(e) => handleChangeNewSub(cat.id, e.target.value)}
                          />
                          <button className="btn-primary" onClick={() => handleAddSub(cat.id)}><Plus size={14} /> Agregar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="gc-modal-overlay">
          <div className="gc-modal">
            <h3>{confirm.title}</h3>
            <p style={{ color: "#666", marginTop: 8 }}>{confirm.message}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="btn-secondary" onClick={closeConfirm}>Cancelar</button>
              <button className="btn-primary" onClick={() => { if (confirm.onConfirm) confirm.onConfirm(); closeConfirm(); }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="gc-toast-wrapper">
        {toasts.map((t) => (
          <div key={t.id} className={`gc-toast gc-toast-${t.type}`}>
            <div className="gc-toast-icon">
              {t.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
            </div>
            <div className="gc-toast-msg">{t.message}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Small helper: left-chevron icon as inline component to avoid extra import ---------- */
function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <path d="M15 18l-6-6 6-6" stroke="#6c5ce7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
