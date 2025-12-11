import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebaseConfig";
import {
  Search,
  Plus,
  Package,
  Edit,
  Trash2,
  Star,
  RefreshCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Tag,
} from "lucide-react";
import AgregarProducto from "../AgregarProducto/AgregarProducto";
import "./GestorProductos.css";

/* ---------------------- CONFIG CACHE ---------------------- */
const CACHE_TTL = 5 * 60 * 1000; // 5min for products/categories
const STORAGE_URL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h for storage path -> downloadURL
const CACHE_KEYS = {
  products: "gestor_products_cache_v1",
  categories: "gestor_categories_cache_v1",
  storageUrls: "gestor_storage_urls_v1",
};

const now = () => new Date().getTime();
const loadCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.data) return null;
    if (now() - parsed.ts > CACHE_TTL && key !== CACHE_KEYS.storageUrls) return null; // storageUrls has its own TTL logic below
    return parsed.data;
  } catch {
    return null;
  }
};
const saveCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: now(), data }));
  } catch {}
};

/* storage URL cache helpers (separate TTL) */
const loadStorageUrlsCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.storageUrls);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed?.map) return {};
    return parsed.map || {};
  } catch {
    return {};
  }
};
const saveStorageUrlsCache = (map) => {
  try {
    localStorage.setItem(
      CACHE_KEYS.storageUrls,
      JSON.stringify({ ts: now(), map })
    );
  } catch {}
};

/* utils */
const isHttp = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
const looksLikeStoragePath = (s) =>
  typeof s === "string" && (s.startsWith("products/") || s.startsWith("gs://") || s.includes("/products/"));

/* ---------------------- COMPONENT ---------------------- */
export default function GestorProductos() {
  const navigate = useNavigate();

  // PRODUCTS & CATEGORIES
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // UI
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Toasts & confirm
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState({ show: false, title: "", message: "", onConfirm: null });

  /* ---------------------- TOAST / CONFIRM ---------------------- */
  const pushToast = (message, type = "success", ttl = 3500) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  };
  const openConfirm = ({ title, message, onConfirm }) => setConfirm({ show: true, title, message, onConfirm });
  const closeConfirm = () => setConfirm({ show: false, title: "", message: "", onConfirm: null });

  /* ---------------------- STORAGE URL RESOLUTION (with local cache) ---------------------- */
  const resolveStorageUrlCached = async (path) => {
    if (!path) return null;
    // load map
    const map = loadStorageUrlsCache();
    const entry = map[path];
    // use cached if fresh
    if (entry && entry.url && entry.ts && now() - entry.ts < STORAGE_URL_CACHE_TTL) {
      return entry.url;
    }
    // else try to getDownloadURL (safe-guard with try/catch)
    try {
      // if starts with gs:// convert? firebase getDownloadURL accepts ref(storage, 'path') or full gs://? We'll pass the path part.
      let storagePath = path;
      if (path.startsWith("gs://")) {
        // gs://bucket/... -> remove gs://bucket/ prefix to get path
        const parts = path.split("/");
        const idx = parts.findIndex((p) => p.includes("products"));
        if (idx >= 0) storagePath = parts.slice(idx).join("/");
      }
      // If the path is already a full URL, return it
      if (isHttp(path)) return path;
      const refObj = storageRef(storage, storagePath);
      const url = await getDownloadURL(refObj);
      // save to cache
      map[path] = { url, ts: now() };
      saveStorageUrlsCache(map);
      return url;
    } catch (err) {
      // can't resolve — return null (the UI will fallback to placeholder)
      console.debug("resolveStorageUrlCached error for", path, err?.message || err);
      return null;
    }
  };

  /* Resolve images for a list of products.
     This function updates products progressively (does not block UI).
     It only calls getDownloadURL for storage-like paths and caches results.
  */
  const resolveImagesForProducts = async (prodList) => {
    if (!Array.isArray(prodList) || prodList.length === 0) return prodList;

    // copy
    const list = prodList.map((p) => ({ ...p }));

    // collect unique storage paths that need resolution (avoid duplicates)
    const pathsToResolve = new Set();
    list.forEach((p) => {
      // prefer single image fields in this order:
      // - p.imageUrl (could be an http or storage path)
      // - p.imageUrls[0]
      // - p.imagePath (if your model uses another name)
      const candidate = (Array.isArray(p.imageUrls) && p.imageUrls[0]) || p.imageUrl || p.imagePath || "";
      if (candidate && !isHttp(candidate) && looksLikeStoragePath(candidate)) {
        pathsToResolve.add(candidate);
      }
    });

    if (pathsToResolve.size === 0) {
      // nothing to resolve
      return list;
    }

    // resolve all unique paths (parallel)
    const pathArray = Array.from(pathsToResolve);
    const resolveMap = {};
    await Promise.all(
      pathArray.map(async (path) => {
        const url = await resolveStorageUrlCached(path);
        if (url) resolveMap[path] = url;
      })
    );

    // apply resolved URLs back to products (progressively)
    const updatedList = list.map((p) => {
      const candidate = (Array.isArray(p.imageUrls) && p.imageUrls[0]) || p.imageUrl || p.imagePath || "";
      if (candidate) {
        if (isHttp(candidate)) {
          // already URL
          return { ...p, imageUrl: candidate };
        }
        if (resolveMap[candidate]) {
          return { ...p, imageUrl: resolveMap[candidate] };
        }
      }
      // fallback: if there's an array of URLs with http, pick first
      if (Array.isArray(p.imageUrls)) {
        const found = p.imageUrls.find((u) => isHttp(u));
        if (found) return { ...p, imageUrl: found };
      }
      return p;
    });

    return updatedList;
  };

  /* ---------------------- FETCH DATA (products + categories) ---------------------- */
  useEffect(() => {
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const cp = loadCache(CACHE_KEYS.products);
        const cc = loadCache(CACHE_KEYS.categories);
        if (cp && cc) {
          // set cached immediately
          setProducts(cp);
          setCategories(cc);
          setLoading(false);
          // still try to refresh images/short updates in background if any storage paths exist
          // but do not block UI
          (async () => {
            const resolved = await resolveImagesForProducts(cp);
            // if resolved changed, update state & cache
            const changed = JSON.stringify(resolved) !== JSON.stringify(cp);
            if (changed) {
              setProducts(resolved);
              saveCache(CACHE_KEYS.products, resolved);
            }
          })();
          return;
        }
      }

      const [snapProducts, snapCategories] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "categories")),
      ]);

      let productsList = snapProducts.docs.map((d) => ({ id: d.id, ...d.data() }));
      const categoriesList = snapCategories.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Resolve storage paths -> download URLs (this may call getDownloadURL; we await it once here)
      productsList = await resolveImagesForProducts(productsList);

      setProducts(productsList);
      setCategories(categoriesList);

      saveCache(CACHE_KEYS.products, productsList);
      saveCache(CACHE_KEYS.categories, categoriesList);
    } catch (err) {
      console.error("fetchData error:", err);
      pushToast("Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    await fetchData(true);
    pushToast("Datos actualizados", "success");
  };

  /* ---------------------- PRODUCTS CRUD ---------------------- */

  const handleDeleteProduct = (id) => {
    openConfirm({
      title: "Eliminar producto",
      message: "¿Eliminar este producto permanentemente?",
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          await deleteDoc(doc(db, "products", id));
          const updated = products.filter((p) => p.id !== id);
          setProducts(updated);
          saveCache(CACHE_KEYS.products, updated);
          pushToast("Producto eliminado", "success");
        } catch (e) {
          console.error("delete error:", e);
          pushToast("Error al eliminar", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setActiveTab("addProduct");
  };

  /* handleProductSubmit: improved to preserve existing image if no new file, and to resolve uploaded file */
  const handleProductSubmit = async (productData, imageFile) => {
    setLoading(true);
    try {
      // Determine current image URL:
      // If editing and there's no new imageFile, we must preserve existing image (editingProduct.imageUrl or editingProduct.imageUrls[0])
      let imageUrl = productData.imageUrl || "";

      if (editingProduct && !imageFile) {
        // prefer editingProduct.imageUrl, fallback to first in array
        imageUrl =
          editingProduct.imageUrl ||
          (Array.isArray(editingProduct.imageUrls) && editingProduct.imageUrls[0]) ||
          imageUrl ||
          "";
      }

      // If provided a new file, upload and use it (overrides)
      if (imageFile) {
        const pathName = `products/${Date.now()}_${imageFile.name}`;
        const imgRef = storageRef(storage, pathName);
        await uploadBytes(imgRef, imageFile);
        imageUrl = await getDownloadURL(imgRef);
        // update storage-url cache for this path
        const map = loadStorageUrlsCache();
        map[pathName] = { url: imageUrl, ts: now() };
        saveStorageUrlsCache(map);
      }

      const finalData = {
        ...productData,
        price: Number(productData.price) || 0,
        stock: Number(productData.stock) || 0,
        discount: Number(productData.discount) || 0,
        destacado: Boolean(productData.destacado),
        imageUrl,
      };

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), finalData);
        const updated = products.map((p) => (p.id === editingProduct.id ? { ...p, ...finalData } : p));
        setProducts(updated);
        saveCache(CACHE_KEYS.products, updated);
        pushToast("Producto actualizado", "success");
      } else {
        const refDoc = await addDoc(collection(db, "products"), finalData);
        const newProduct = { ...finalData, id: refDoc.id };
        const updated = [...products, newProduct];
        setProducts(updated);
        saveCache(CACHE_KEYS.products, updated);
        pushToast("Producto agregado", "success");
      }

      setEditingProduct(null);
      setActiveTab("list");
    } catch (err) {
      console.error("handleProductSubmit error:", err);
      pushToast("Error al guardar", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------- FILTER ---------------------- */
  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    // handle category stored as id or name
    const cat = p?.category || "";
    const catText = (typeof cat === "string" ? cat : (cat?.name || "")).toLowerCase();
    return (p?.name?.toLowerCase().includes(q) || catText.includes(q));
  });

  /* ---------------------- RENDER ---------------------- */
  const placeholder = "https://via.placeholder.com/300";

  return (
    <>
      <div className="gestor-container">
        <div className="gestor-card">
          <div className="gestor-header">
            <h2 className="gestor-title">
              <Package className="title-icon" />
              Gestión de Productos
            </h2>
            <p className="gestor-subtitle">Administra tu catálogo completo</p>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <button className={`tab-btn ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}>
              Lista de Productos
            </button>

            <button className={`tab-btn ${activeTab === "addProduct" ? "active" : ""}`} onClick={() => { setEditingProduct(null); setActiveTab("addProduct"); }}>
              <Plus size={18} /> Nuevo Producto
            </button>

            <button className="tab-btn" onClick={() => navigate("/admin/categorias")}>
              <Tag size={18} /> Categorías
            </button>

            <button className="tab-btn" onClick={handleForceRefresh}>
              <RefreshCcw size={16} /> Refrescar
            </button>
          </div>

          {/* List */}
          {activeTab === "list" && (
            <div className="list-view">
              <div className="search-container">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {loading ? (
                <div className="skeleton-grid">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="skeleton-card">
                      <div className="skeleton-img"></div>
                      <div className="skeleton-line short"></div>
                      <div className="skeleton-line"></div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <Package size={64} strokeWidth={1.5} />
                  <h3>No hay productos</h3>
                  <p>Agrega tu primer producto para comenzar</p>
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="product-card">
                      <div className="product-image-wrapper">
                        <img
                          src={
    product.imageUrls?.[0] ||
    product.imageUrl ||
    product.image ||
    "https://placehold.co/400x400?text=Sin+Imagen"
  }
                          alt={product.name || "Producto"}
                          className="product-image"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholder; }}
                        />

                        {product.destacado && (
                          <div className="featured-badge">
                            <Star size={14} fill="currentColor" /> Destacado
                          </div>
                        )}

                        {product.discount > 0 && (
                          <div className="discount-badge">
                            -{product.discount}%
                          </div>
                        )}
                      </div>

                      <div className="product-info">
                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-category">{product.category || "Sin categoría"}</p>

                        <div className="product-price">
                          {product.discount > 0 ? (
                            <>
                              <span className="old-price">${product.price.toFixed(2)}</span>
                              <span className="new-price">${(product.price * (1 - product.discount / 100)).toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="new-price">${product.price.toFixed(2)}</span>
                          )}
                        </div>

                        <div className="product-stock">
                          <span className={`stock-badge ${product.stock === 0 ? "out" : product.stock <= 5 ? "low" : ""}`}>
                            {product.stock === 0 ? "Agotado" : product.stock <= 5 ? `Solo ${product.stock}` : `${product.stock} en stock`}
                          </span>
                        </div>
                      </div>

                      <div className="product-actions">
                        <button onClick={() => handleEditProduct(product)} className="btn-edit">
                          <Edit size={16} /> Editar
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="btn-delete">
                          <Trash2 size={16} /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add/Edit */}
          {activeTab === "addProduct" && (
            <AgregarProducto
              onSubmit={handleProductSubmit}
              initialData={editingProduct}
              categories={categories}
              onClose={() => { setActiveTab("list"); setEditingProduct(null); }}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirm.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{confirm.title}</h3>
            <p style={{ color: "#666", marginTop: 8 }}>{confirm.message}</p>
            <div className="modal-actions" style={{ marginTop: 18 }}>
              <button className="btn-primary" onClick={() => { try { confirm.onConfirm && confirm.onConfirm(); } catch(e) { console.error(e); } }}>
                Confirmar
              </button>
              <button className="btn-secondary" onClick={closeConfirm}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-icon">
              {t.type === "success" && <CheckCircle size={18} />}
              {t.type === "error" && <XCircle size={18} />}
              {t.type === "info" && <AlertCircle size={18} />}
            </div>
            <div className="toast-text">{t.message}</div>
            <button className="toast-close" onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}>✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
