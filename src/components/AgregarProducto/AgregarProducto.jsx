import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  X,
  Upload,
  Trash2,
  Star,
  Percent,
  Package,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { storage, db } from "../../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import "./AgregarProducto.css";

/*
  AgregarProducto optimizado:
  - Minimiza lecturas a Firestore (cache local + uso de props.categories si viene)
  - Sube solo imágenes nuevas; reusa URLs existentes
  - Añade campo cashPrice (precio contado/transferencia)
  - Lee categories + subcategories para selects
  - UX: toasts locales, bloqueo durante subida/guardado, validaciones
*/

const CATEGORIES_CACHE_KEY = "app_categories_cache_v1";
const CATEGORIES_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function loadCategoriesCache() {
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.data) return null;
    if (Date.now() - parsed.ts > CATEGORIES_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
function saveCategoriesCache(data) {
  try {
    localStorage.setItem(
      CATEGORIES_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {}
}

export default function AgregarProducto({
  onSubmit, // function called after success (optional)
  initialData = null, // if editing, product object
  categories: categoriesProp = null, // optional: pass categories from parent to avoid read
  onClose, // close the modal
}) {
  // Form state
  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price ?? "",
    cashPrice: initialData?.cashPrice ?? "", // nuevo campo para contado/transferencia
    stock: initialData?.stock ?? 0,
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    discount: initialData?.discount ?? 0,
    destacado: Boolean(initialData?.destacado),
  });

  // Images: we keep two arrays
  // - existingUrls: URLs already in initialData (won't reupload)
  // - newFiles: File objects the user picked (will be uploaded)
  const [existingUrls, setExistingUrls] = useState(
    initialData?.imageUrls ? [...initialData.imageUrls] : initialData?.imageUrl ? [initialData.imageUrl] : []
  );
  const [newFiles, setNewFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState(() => {
    // previews show both existingUrls and object URLs for newFiles
    const p = initialData?.imageUrls ? [...initialData.imageUrls] : initialData?.imageUrl ? [initialData.imageUrl] : [];
    return p;
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);

  // categories state (read from prop or firestore with cache)
  const [categories, setCategories] = useState(categoriesProp || []);
  const categoriesLoadedRef = useRef(Boolean(categoriesProp));

  // Toasts local
  const [toasts, setToasts] = useState([]); // {id, type, text}
  const pushToast = (text, type = "success", ttl = 3000) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  };

  // Validation errors
  const [errors, setErrors] = useState({});

  // Effects: if categoriesProp not provided, try cache then fetch
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (categoriesProp) {
        // parent provided categories (best case) — use directly
        setCategories(categoriesProp);
        categoriesLoadedRef.current = true;
        return;
      }
      // check cache
      const cached = loadCategoriesCache();
      if (cached) {
        setCategories(cached);
        categoriesLoadedRef.current = true;
        return;
      }
      // fetch once
      try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const snap = await getDocs(q);
        if (!mounted) return;
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCategories(arr);
        categoriesLoadedRef.current = true;
        saveCategoriesCache(arr);
      } catch (err) {
        console.error("Error fetching categories:", err);
        pushToast("Error cargando categorías", "error");
      }
    };
    load();
    return () => { mounted = false; };
  }, [categoriesProp]);

  // Derived subcategories for selected category
  const subcategoriesForSelected = useMemo(() => {
    const cat = categories.find((c) => c.id === form.category || c.name === form.category);
    return cat ? (Array.isArray(cat.subcategories) ? cat.subcategories : []) : [];
  }, [categories, form.category]);

  // Keep previews in sync when existingUrls or newFiles change
  useEffect(() => {
    const objectUrls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews([...existingUrls, ...objectUrls]);
    // free object urls on unmount or change
    return () => {
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [existingUrls, newFiles]);

  // Handle field changes
  const handleField = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors((err) => ({ ...err, [name]: null }));
  };

  // Handle new image files
  const handleImageFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // optional: validate size/type (max 5MB)
    const MAX_MB = 5;
    const validFiles = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        pushToast("Solo se permiten imágenes", "error");
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        pushToast(`Máx ${MAX_MB}MB por imagen`, "error");
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    setNewFiles((prev) => [...prev, ...validFiles]);
  };

  // Remove preview (either existing url or new file)
  const removePreview = (index) => {
    const existingCount = existingUrls.length;
    if (index < existingCount) {
      // remove existing url at index
      setExistingUrls((prev) => prev.filter((_, i) => i !== index));
      pushToast("Imagen removida (existente)", "info");
    } else {
      const fileIndex = index - existingCount;
      setNewFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      pushToast("Imagen removida", "info");
    }
  };

  // Validation before submit
  const validate = () => {
    const errs = {};
    if (!form.name || !String(form.name).trim()) errs.name = "Nombre obligatorio";
    if (form.price === "" || Number(form.price) < 0) errs.price = "Precio inválido";
    // cashPrice optional but if present must be >= 0
    if (form.cashPrice !== "" && Number(form.cashPrice) < 0) errs.cashPrice = "Precio contado inválido";
    if (!form.category) errs.category = "Seleccionar categoría";
    // optionally require subcategory? not required
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Upload newFiles to Firebase Storage (parallel), returning array of urls
  // We update overall progress (simple approximation)
  const uploadNewFiles = async () => {
    if (newFiles.length === 0) return [];
    const total = newFiles.length;
    setUploadProgressPct(0);
    // Upload all in parallel
    const uploadPromises = newFiles.map(async (file, idx) => {
      // name unique
      const ext = file.name.split(".").pop();
      const name = `products/${Date.now()}_${uuidv4()}.${ext}`;
      const storageRef = ref(storage, name);
      // Using uploadBytes (no resumable progress access here), so we approximate progress
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      // approximate progress
      setUploadProgressPct(Math.round(((idx + 1) / total) * 100));
      return url;
    });
    const urls = await Promise.all(uploadPromises);
    setUploadProgressPct(100);
    return urls;
  };

  // Main submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      pushToast("Corrige los errores del formulario", "error");
      return;
    }

    setUploading(true);
    try {
      // Prepare final image url list: existingUrls + uploaded new ones
      let finalUrls = [...existingUrls];

      // upload new files (if any)
      if (newFiles.length > 0) {
        pushToast("Subiendo imágenes...", "info");
        const uploaded = await uploadNewFiles();
        finalUrls = [...finalUrls, ...uploaded];
      }

      // Prepare product payload
      const payload = {
        name: String(form.name).trim(),
        description: String(form.description || "").trim(),
        price: Number(form.price) || 0,
        cashPrice: form.cashPrice !== "" ? Number(form.cashPrice) : Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        category: form.category,
        subcategory: form.subcategory || "",
        discount: Number(form.discount) || 0,
        destacado: Boolean(form.destacado),
        imageUrls: finalUrls,
        updatedAt: new Date(),
      };

      // If editing, merge
      if (initialData?.id) {
        await setDoc(doc(db, "products", initialData.id), payload, { merge: true });
        pushToast("Producto actualizado", "success");
        onSubmit && onSubmit({ ...payload, id: initialData.id });
      } else {
        const refDoc = await addDoc(collection(db, "products"), {
          ...payload,
          createdAt: new Date(),
        });
        pushToast("Producto creado", "success");
        onSubmit && onSubmit({ ...payload, id: refDoc.id });
      }

      // update cache in localStorage if parent uses it (we don't assume here)
      // Close
      onClose && onClose();
    } catch (err) {
      console.error("Save product error:", err);
      pushToast("Error guardando producto", "error");
    } finally {
      setUploading(false);
      setUploadProgressPct(0);
    }
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handler = (ev) => {
      if (ev.key === "Escape") onClose && onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // UX helpers
  const existingCount = existingUrls.length;
  const totalPreviews = previews.length;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div className="ap-form-overlay" onClick={() => !uploading && onClose && onClose()}>
        <div className="ap-form-container" onClick={(e) => e.stopPropagation()}>
          <div className="ap-form-header">
            <h2 className="ap-form-title">
              <Package size={24} />
              {initialData ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <button onClick={() => !uploading && onClose && onClose()} className="ap-close-btn" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="ap-product-form" noValidate>
            <div className="ap-form-grid">
              {/* Name */}
              <div className="ap-form-group">
                <label>Nombre *</label>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleField}
                  placeholder='Monitor Samsung 27"'
                  disabled={uploading}
                />
                {errors.name && <div className="ap-field-error">{errors.name}</div>}
              </div>

              {/* Category & Subcategory */}
              <div className="ap-form-group">
                <label>Categoría *</label>
                <select name="category" value={form.category} onChange={handleField} disabled={uploading}>
                  <option value="">Seleccionar categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id || c.name}>{c.name ?? c}</option>
                  ))}
                </select>
                {errors.category && <div className="ap-field-error">{errors.category}</div>}
              </div>

              <div className="ap-form-group">
                <label>Subcategoría</label>
                <select name="subcategory" value={form.subcategory} onChange={handleField} disabled={uploading || subcategoriesForSelected.length===0}>
                  <option value="">(ninguna)</option>
                  {subcategoriesForSelected.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Price and cashPrice */}
              <div className="ap-form-group">
                <label>Precio (lista) *</label>
                <div className="ap-price-input-wrapper">
                  <span className="ap-currency">$</span>
                  <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleField} disabled={uploading} />
                </div>
                {errors.price && <div className="ap-field-error">{errors.price}</div>}
              </div>

              <div className="ap-form-group">
                <label>Precio contado / transferencia</label>
                <div className="ap-price-input-wrapper">
                  <span className="ap-currency">$</span>
                  <input name="cashPrice" type="number" min="0" step="0.01" value={form.cashPrice} onChange={handleField} disabled={uploading} />
                </div>
                <small className="ap-hint">Si lo dejas vacío, se usará el precio de lista.</small>
                {errors.cashPrice && <div className="ap-field-error">{errors.cashPrice}</div>}
              </div>

              {/* Discount */}
              <div className="ap-form-group">
                <label>Descuento (%)</label>
                <div className="ap-discount-input-wrapper">
                  <input name="discount" type="number" min="0" max="90" step="1" value={form.discount} onChange={handleField} disabled={uploading} />
                  <Percent size={18} className="ap-discount-icon" />
                </div>
              </div>

              {/* Stock */}
              <div className="ap-form-group">
                <label>Stock</label>
                <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleField} disabled={uploading} />
              </div>

              {/* Destacado */}
              <div className="ap-form-group checkbox-group">
                <label className="ap-checkbox-label">
                  <input name="destacado" type="checkbox" checked={form.destacado} onChange={handleField} disabled={uploading} />
                  <Star size={16} className={`ap-star-icon ${form.destacado ? "filled" : ""}`} />
                  Destacado
                </label>
              </div>

              {/* Description full width */}
              <div className="ap-form-group full-width">
                <label>Descripción</label>
                <textarea name="description" rows="3" value={form.description} onChange={handleField} disabled={uploading}></textarea>
              </div>

              {/* Images */}
              <div className="ap-form-group full-width">
                <label>Imágenes ({previews.length})</label>
                <div className="ap-image-upload-area">
                  <input type="file" accept="image/*" multiple onChange={handleImageFiles} id="image-upload" className="ap-hidden-input" disabled={uploading} />
                  <label htmlFor="image-upload" className={`ap-upload-label ${uploading ? "disabled" : ""}`}>
                    {uploading ? (
                      <>
                        <Loader2 size={28} className="ap-spin" />
                        <span>Subiendo... {uploadProgressPct}%</span>
                      </>
                    ) : (
                      <>
                        <Upload size={28} />
                        <span>Click o arrastrá imágenes</span>
                        <small>JPG, PNG, WebP • Máx 5MB</small>
                      </>
                    )}
                  </label>

                  {previews.length > 0 && (
                    <div className="ap-image-preview-grid">
                      {previews.map((src, i) => (
                        <div key={i} className="ap-image-preview-item">
                          <img src={src} alt={`prev-${i}`} />
                          {!uploading && (
                            <button type="button" onClick={() => removePreview(i)} className="ap-remove-image-btn" title="Remover imagen">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="ap-form-actions">
              <button type="button" className="ap-btn-cancel" onClick={() => !uploading && onClose && onClose()} disabled={uploading}>
                Cancelar
              </button>

              <button type="submit" className="ap-btn-submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 size={18} className="ap-spin" /> Guardando...
                  </>
                ) : initialData ? "Actualizar" : "Crear producto"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toasts */}
      <div className="ap-toasts-wrapper">
        {toasts.map((t) => (
          <div key={t.id} className={`ap-toast ${t.type}`}>
            <div className="ap-toast-icon">{t.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}</div>
            <div className="ap-toast-text">{t.text}</div>
          </div>
        ))}
      </div>
    </>
  );
}
