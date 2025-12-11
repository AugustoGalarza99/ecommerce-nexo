import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { Search, X, Package, Filter, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import "./Productos.css";

function Productos() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const productsPerPage = 12;
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "categories"))
        ]);

        const productList = productsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const categoriesList = categoriesSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));

        setProducts(productList);
        setFilteredProducts(productList);
        setCategories([{ id: "all", name: "Todas" }, ...categoriesList]);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = [...products];

    if (selectedCategory !== "all") {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (searchTerm) {
      result = result.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Stock primero
    result.sort((a, b) => (b.stock > 0) - (a.stock > 0));

    switch (sortOption) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "name-asc": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, sortOption, products]);

  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handleAddToCart = (product) => {
    if (product.stock > 0) {
      addToCart({ ...product, quantity: 1 });
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div className="prod-page">
        <div className="prod-header">
          <h1 className="prod-title">
            <Package size={40} /> Nuestros Productos
          </h1>
          <p className="prod-subtitle">Explora nuestra colección completa</p>
        </div>

        <div className="prod-container">
          {/* SIDEBAR */}
          <aside className="prod-sidebar">
            <div className="prod-sidebar-header">
              <Filter size={22} />
              <h3>Categorías</h3>
            </div>
            <ul className="prod-category-list">
              {categories.map((cat, i) => (
                <li key={cat.id}>
                  <button
                    onClick={() => setSelectedCategory(cat.id === "all" ? "all" : cat.name)}
                    className={selectedCategory === (cat.id === "all" ? "all" : cat.name) ? "prod-cat-btn prod-active" : "prod-cat-btn"}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    {cat.id === "all" ? <Sparkles size={18} /> : null}
                    {cat.name}
                    {cat.id !== "all" && (
                      <span className="prod-cat-count">
                        ({products.filter(p => p.category === cat.name).length})
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* MAIN */}
          <main className="prod-main">
            {/* FILTROS */}
            <div className="prod-filters-bar">
              <div className="prod-search-container">
                <Search size={22} className="prod-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="prod-clear-search">
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* AQUÍ ESTABA EL ERROR → CORREGIDO */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="prod-sort-select"
              >
                <option value="default">Ordenar por defecto</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name-asc">Nombre: A-Z</option>
              </select>
            </div>

            <div className="prod-results-info">
              Mostrando {currentProducts.length} de {filteredProducts.length} productos
            </div>

            {/* GRID */}
            <div className="prod-grid">
              {loading ? (
                [...Array(12)].map((_, i) => (
                  <div key={i} className="prod-card prod-skeleton">
                    <div className="prod-skeleton-img"></div>
                    <div className="prod-skeleton-line"></div>
                    <div className="prod-skeleton-line short"></div>
                  </div>
                ))
              ) : currentProducts.length === 0 ? (
                <div className="prod-no-results">
                  <Package size={80} opacity={0.3} />
                  <p>No se encontraron productos</p>
                </div>
              ) : (
                currentProducts.map((product, i) => {
                  const precioFinal = product.discount > 0 
                    ? product.price * (1 - product.discount / 100) 
                    : product.price;

                  return (
                    <div
                      key={product.id}
                      className="prod-card"
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <Link to={`/product/${product.id}`} className="prod-link">
                        <div className="prod-image-container">
                          <img
                            src={
                              product.imageUrls?.[0] || 
                              product.imageUrl || 
                              product.image || 
                              "https://via.placeholder.com/400x400/f8f9ff/e0e0e0?text=Sin+Foto"
                            }
                            alt={product.name}
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://via.placeholder.com/400x400/f8f9ff/999999?text=No+disponible";
                            }}
                          />
                          {product.discount > 0 && (
                            <div className="prod-discount-badge">-{product.discount}%</div>
                          )}
                          {product.destacado && (
                            <div className="prod-featured-badge">Destacado</div>
                          )}
                          {product.stock <= 0 && (
                            <div className="prod-outstock-overlay">Sin stock</div>
                          )}
                        </div>

                        <div className="prod-info">
                          <h3 className="prod-name">{product.name}</h3>

                          <div className="prod-price-container">
                            {product.discount > 0 ? (
                              <>
                                <span className="prod-original-price">
                                  ${product.price?.toLocaleString("es-AR")}
                                </span>
                                <span className="prod-final-price">
                                  ${precioFinal.toLocaleString("es-AR")}
                                </span>
                              </>
                            ) : (
                              <span className="prod-final-price solo">
                                ${product.price?.toLocaleString("es-AR")}
                              </span>
                            )}
                          </div>

                          <div className="prod-stock-info">
                            {product.stock > 0 ? (
                              <span className="prod-in-stock">En stock ({product.stock})</span>
                            ) : (
                              <span className="prod-no-stock">Sin stock</span>
                            )}
                          </div>
                        </div>
                      </Link>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock <= 0}
                        className={`prod-add-btn ${product.stock <= 0 ? "prod-disabled" : ""}`}
                      >
                        {product.stock > 0 ? "Agregar al carrito" : "Sin stock"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="prod-pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="prod-page-btn"
                >
                  <ChevronLeft size={22} />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={currentPage === i + 1 ? "prod-page-btn prod-active" : "prod-page-btn"}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="prod-page-btn"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default Productos;