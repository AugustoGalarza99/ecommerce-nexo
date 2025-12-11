import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../firebaseConfig";
import "./AdminBanner.css";

function AdminBanner() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [banners, setBanners] = useState([]);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const querySnapshot = await getDocs(collection(db, "banners"));
    const bannerData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      order: doc.data().order ?? 0,
    }));
    setBanners(bannerData.sort((a, b) => a.order - b.order));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!image) return alert("Selecciona una imagen");

    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${image.name}`);
      await uploadBytes(storageRef, image);
      const imageUrl = await getDownloadURL(storageRef);

      const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.order)) : -1;
      const newBanner = { image: imageUrl, order: maxOrder + 1 };

      const docRef = await addDoc(collection(db, "banners"), newBanner);
      setBanners(prev => [...prev, { id: docRef.id, ...newBanner }].sort((a, b) => a.order - b.order));

      setImage(null);
      setPreviewUrl(null);
      document.querySelector('#banner-upload').value = "";
    } catch (err) {
      console.error(err);
      alert("Error al subir la imagen");
    }
  };

  const handleDelete = async (id, imageUrl) => {
    if (!window.confirm("¿Eliminar este banner permanentemente?")) return;

    try {
      await deleteObject(ref(storage, imageUrl)).catch(() => {});
      await deleteDoc(doc(db, "banners", id));
      setBanners(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  const handleDragStart = (e, id) => setDraggingId(id);
  const handleDragEnd = () => setDraggingId(null);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (draggingId === targetId || !draggingId) return;

    const newBanners = [...banners];
    const dragged = newBanners.find(b => b.id === draggingId);
    const target = newBanners.find(b => b.id === targetId);

    [dragged.order, target.order] = [target.order, dragged.order];

    await Promise.all([
      updateDoc(doc(db, "banners", dragged.id), { order: dragged.order }),
      updateDoc(doc(db, "banners", target.id), { order: target.order }),
    ]);

    setBanners(newBanners.sort((a, b) => a.order - b.order));
    setDraggingId(null);
  };

  return (
    <>
      {/* Google Fonts - Quicksand */}
      <link
        href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="admin-banner-wrapper">
        <div className="admin-banner-card">
          {/* Título elegante */}
          <h2 className="banner-title">
            <svg className="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
            </svg>
            Gestión de Banners
          </h2>

          {/* Upload Section */}
          <div className="upload-section">
            <div className="file-upload-group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                id="banner-upload"
              />
              <label htmlFor="banner-upload" className="upload-btn glass">
                Seleccionar Imagen
              </label>
            </div>

            {previewUrl && (
              <div className="preview-box">
                <img src={previewUrl} alt="Previsualización" className="preview-img" />
                <p className="preview-label">Vista previa</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!image}
              className={`submit-btn glass ${!image ? "disabled" : ""}`}
            >
              Subir Banner
            </button>
          </div>

          {/* Lista de Banners */}
          <div className="banners-section">
            <p className="info-hint">
              Arrastra las tarjetas para cambiar el orden • {banners.length} banner{banners.length !== 1 ? "s" : ""}
            </p>

            {banners.length === 0 ? (
              <div className="empty-state">
                <p>No hay banners aún</p>
                <span>Sube el primero para comenzar</span>
              </div>
            ) : (
              <div className="banners-grid">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className={`banner-item ${draggingId === banner.id ? "dragging" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, banner.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, banner.id)}
                  >
                    <img src={banner.image} alt="Banner" className="banner-img" />
                    <div className="overlay">
                      <span className="order-tag">#{banner.order + 1}</span>
                      <button
                        onClick={() => handleDelete(banner.id, banner.image)}
                        className="delete-btn glass"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminBanner;