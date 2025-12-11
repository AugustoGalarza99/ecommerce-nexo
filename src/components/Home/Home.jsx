import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import Carousel from "../Carousel/Carousel";
import { Package, Zap, Star, Truck, ChevronRight, Sparkles } from "lucide-react";
import "./Home.css";

function Home() {
  const [categorias, setCategorias] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catsSnap, prodsSnap] = await Promise.all([
          getDocs(collection(db, "categories")),
          getDocs(collection(db, "products"))
        ]);

        const cats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allProducts = prodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setCategorias(cats);
        setDestacados(allProducts.filter(p => p.destacado));
        setOfertas(allProducts.filter(p => p.discount > 0).slice(0, 12)); // max 12 ofertas
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div className="home-page">
        {/* HERO + CAROUSEL */}
        <section className="home-hero">
          <div className="home-hero-content">
            <h1 className="home-hero-title">
              <Sparkles size={48} />
              Bienvenido a NexoLab
            </h1>
            <p className="home-hero-subtitle">
              Los mejores productos al mejor precio. Envío gratis en todo el país.
            </p>
            <Link to="/productos" className="home-cta-btn">
              Ver todos los productos <ChevronRight size={24} />
            </Link>
          </div>
          <Carousel />
        </section>

        {/* CATEGORÍAS DESTACADAS */}
        {categorias.length > 0 && (
          <section className="home-categories">
            <div className="home-section-header">
              <h2>Explora por categoría</h2>
              <Link to="/productos" className="home-view-all">Ver todo →</Link>
            </div>

            <div className="home-cat-grid">
              {categorias.slice(0, 6).map((cat, i) => (
                <Link
                  to={`/productos?categoria=${cat.name}`}
                  key={cat.id}
                  className="home-cat-card"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="home-cat-icon">
                    <Package size={36} />
                  </div>
                  <h3>{cat.name}</h3>
                  <span className="home-cat-arrow"><ChevronRight size={20} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* PRODUCTOS DESTACADOS */}
        <section className="home-featured">
          <div className="home-section-header">
            <h2>
              <Star size={32} /> Productos Destacados
            </h2>
            <Link to="/productos" className="home-view-all">Ver más →</Link>
          </div>

          <div className="home-products-grid">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="home-card home-skeleton">
                  <div className="home-skel-img"></div>
                  <div className="home-skel-text"></div>
                  <div className="home-skel-text short"></div>
                </div>
              ))
            ) : destacados.length === 0 ? (
              <p className="home-empty">No hay productos destacados por el momento</p>
            ) : (
              destacados.map((p, i) => (
                <Link to={`/product/${p.id}`} key={p.id} className="home-card" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="home-card-img">
                    <img
                      src={p.imageUrls?.[0] || p.imageUrl || "https://via.placeholder.com/300"}
                      alt={p.name}
                      loading="lazy"
                    />
                    {p.destacado && <div className="home-badge-featured">Destacado</div>}
                  </div>
                  <div className="home-card-body">
                    <h3 className="home-card-title">{p.name}</h3>
                    <div className="home-card-price">
                      ${p.price?.toLocaleString("es-AR")}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* OFERTAS ESPECIALES */}
        {ofertas.length > 0 && (
          <section className="home-offers">
            <div className="home-section-header">
              <h2>
                <Zap size={36} /> Ofertas Relámpago
              </h2>
              <span className="home-offer-tag">¡Solo por hoy!</span>
            </div>

            <div className="home-products-grid">
              {ofertas.map((p, i) => {
                const precioFinal = p.price * (1 - p.discount / 100);
                return (
                  <Link to={`/product/${p.id}`} key={p.id} className="home-card offer" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="home-card-img">
                      <img src={p.imageUrls?.[0] || p.imageUrl} alt={p.name} loading="lazy" />
                      <div className="home-badge-discount">-{p.discount}%</div>
                    </div>
                    <div className="home-card-body">
                      <h3 className="home-card-title">{p.name}</h3>
                      <div className="home-price-group">
                        <span className="home-old-price">${p.price.toLocaleString("es-AR")}</span>
                        <span className="home-new-price">${precioFinal.toLocaleString("es-AR")}</span>
                      </div>
                      <span className="home-save-text">
                        Ahorrás ${ (p.price * p.discount / 100).toLocaleString("es-AR") }
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* BANNER FINAL */}
        <section className="home-final-cta">
          <div className="home-cta-content">
            <Truck size={60} />
            <h2>Envío gratis en todas tus compras</h2>
            <p>Y devoluciones sin costo en los primeros 30 días</p>
            <Link to="/productos" className="home-cta-btn secondary">
              Comprar ahora
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

export default Home;