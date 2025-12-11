import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useCart } from "../../context/CartContext";
import { ChevronLeft, ChevronRight, Plus, Minus, ShoppingCart, Package, Truck, Zap } from "lucide-react";
import Swal from "sweetalert2";
import "./ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docSnap = await getDoc(doc(db, "products", id));
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const images = product?.imageUrls || [product?.imageUrl || "https://via.placeholder.com/600"];

  const handleAddToCart = () => {
    if (product.stock < quantity) {
      Swal.fire("Stock insuficiente", `Solo quedan ${product.stock} unidades`, "warning");
      return;
    }
    addToCart({ ...product, quantity });

    Swal.fire({
      icon: "success",
      title: "¡Listo!",
      html: `<strong>${quantity} × ${product.name}</strong><br>agregado al carrito`,
      timer: 2000,
      toast: true,
      position: "top-end",
      background: "#6c5ce7",
      color: "white",
    });
  };

  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-skeleton-img"></div>
        <div className="pd-skeleton-info">
          <div className="pd-skel-line long"></div>
          <div className="pd-skel-line"></div>
          <div className="pd-skel-line short"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pd-notfound">
        <Package size={90} />
        <h2>Producto no encontrado</h2>
        <button onClick={() => navigate("/productos")} className="pd-back-btn">
          ← Volver a la tienda
        </button>
      </div>
    );
  }

  const finalPrice = product.discount > 0 
    ? product.price * (1 - product.discount / 100) 
    : product.price;

  const savings = product.discount > 0 
    ? product.price * (product.discount / 100) 
    : 0;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div className="pd-page">
        <div className="pd-container">

          {/* GALERÍA */}
          <div className="pd-gallery">
            <div className="pd-main-img-wrapper">
              <button
                className="pd-arrow pd-left"
                onClick={() => setSelectedImg(prev => prev === 0 ? images.length - 1 : prev - 1)}
              >
                <ChevronLeft size={30} />
              </button>

              <img
                src={images[selectedImg]}
                alt={product.name}
                className="pd-main-img"
                loading="lazy"
              />

              {product.discount > 0 && <div className="pd-big-discount">-{product.discount}%</div>}
              {product.stock <= 0 && <div className="pd-soldout">SIN STOCK</div>}

              <button
                className="pd-arrow pd-right"
                onClick={() => setSelectedImg(prev => prev === images.length - 1 ? 0 : prev + 1)}
              >
                <ChevronRight size={30} />
              </button>
            </div>

            {images.length > 1 && (
              <div className="pd-thumbs">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={i === selectedImg ? "pd-thumb pd-active" : "pd-thumb"}
                  >
                    <img src={img} alt={`Miniatura ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="pd-info">
            <h1 className="pd-title">{product.name}</h1>

            <div className="pd-meta">
              <div className="pd-stock">
                {product.stock > 0 ? (
                  <span className="pd-instock">
                    <Zap size={18} /> En stock ({product.stock})
                  </span>
                ) : (
                  <span className="pd-outstock">Sin stock</span>
                )}
              </div>
            </div>

            {/* PRECIO - CORREGIDO 100% */}
            <div className="pd-price-box">
              {product.discount > 0 ? (
                <>
                  <span className="pd-old-price">
                    ${product.price.toLocaleString("es-AR")}
                  </span>
                  <span className="pd-new-price">
                    ${finalPrice.toLocaleString("es-AR")}
                  </span>
                  <span className="pd-savings">
                    Ahorrás ${savings.toLocaleString("es-AR")}
                  </span>
                </>
              ) : (
                <span className="pd-new-price">
                  ${product.price.toLocaleString("es-AR")}
                </span>
              )}
            </div>

            {product.stock > 0 && product.stock <= 8 && (
              <div className="pd-low-stock">
                <div className="pd-bar" style={{ width: `${(product.stock / 10) * 100}%` }}></div>
                ¡Apurate! Quedan solo {product.stock} unidades
              </div>
            )}

            <p className="pd-desc">{product.description || "Sin descripción disponible."}</p>

            <div className="pd-features">
              <div><Truck size={20} /> Envío gratis</div>
              <div><Package size={20} /> Devolución fácil</div>
            </div>

            {/* ACCIONES */}
            <div className="pd-actions">
              <div className="pd-quantity">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                  <Minus size={20} />
                </button>
                <span>{quantity}</span>
                <button
                  onClick={() => setQuantity(q => product.stock > 0 ? Math.min(product.stock, q + 1) : q)}
                  disabled={product.stock <= quantity}
                >
                  <Plus size={20} />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="pd-add-cart"
              >
                <ShoppingCart size={24} />
                {product.stock > 0 ? "Agregar al carrito" : "Sin stock"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductDetail;