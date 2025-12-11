import { useState, useEffect } from "react";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  Home, 
  Loader2, 
  CheckCircle,
  Camera 
} from "lucide-react";
import Swal from "sweetalert2";
import "./Perfil.css";

function Perfil() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    address: "",
    phone: "",
    zipCode: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser.uid);
      } else {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadUserData = async (uid) => {
    try {
      const userDoc = doc(db, "users", uid);
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        setProfileData(docSnap.data());
      } else {
        // Si no existe, usa datos de Firebase Auth
        setProfileData({
          name: currentUser.displayName || "",
          address: "",
          phone: "",
          zipCode: "",
        });
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), profileData, { merge: true });

      // Actualizar nombre en Firebase Auth si cambió
      if (profileData.name && profileData.name !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: profileData.name });
      }

      Swal.fire({
        icon: "success",
        title: "¡Perfil actualizado!",
        text: "Tus datos se guardaron correctamente",
        toast: true,
        position: "top-end",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        background: "#6c5ce7",
        color: "white",
      });
    } catch (error) {
      Swal.fire("Error", "No se pudo guardar el perfil", "error");
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUrl = () => {
    if (user?.photoURL) return user.photoURL;

    const name = profileData.name || user?.displayName || user?.email || "U";
    const firstLetter = name.charAt(0).toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=fff&size=256&bold=true&font-size=0.4`;
  };

  if (loading) {
    return (
      <div className="pf-loading">
        <div className="pf-skeleton-avatar"></div>
        <div className="pf-skeleton-lines">
          <div className="pf-skel-line"></div>
          <div className="pf-skel-line long"></div>
          <div className="pf-skel-line"></div>
          <div className="pf-skel-line short"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div className="pf-page">
        <div className="pf-container">
          <div className="pf-header">
            <h1 className="pf-title">
              <User size={36} />
              Mi Perfil
            </h1>
            <p className="pf-subtitle">Gestioná tus datos personales y de envío</p>
          </div>

          <div className="pf-card">
            {/* AVATAR */}
            <div className="pf-avatar-section">
              <div className="pf-avatar-wrapper">
                <img
                  src={getAvatarUrl()}
                  alt="Foto de perfil"
                  className="pf-avatar"
                />
                <div className="pf-avatar-overlay">
                  <Camera size={28} />
                </div>
              </div>
              <div className="pf-user-info">
                <h2>{profileData.name || "Usuario"}</h2>
                <p className="pf-email">
                  <Mail size={18} /> {user?.email}
                </p>
              </div>
            </div>

            {/* FORMULARIO */}
            <div className="pf-form">
              <div className="pf-input-group">
                <label>
                  <User size={20} />
                  Nombre completo
                </label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="pf-input"
                />
              </div>

              <div className="pf-input-group">
                <label>
                  <Home size={20} />
                  Dirección de envío
                </label>
                <input
                  type="text"
                  placeholder="Av. Siempre Viva 123"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="pf-input"
                />
              </div>

              <div className="pf-input-group">
                <label>
                  <Phone size={20} />
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="11 1234-5678"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="pf-input"
                />
              </div>

              <div className="pf-input-group">
                <label>
                  <MapPin size={20} />
                  Código Postal
                </label>
                <input
                  type="text"
                  placeholder="C1437"
                  value={profileData.zipCode}
                  onChange={(e) => setProfileData({ ...profileData, zipCode: e.target.value })}
                  className="pf-input"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className={`pf-save-btn ${saving ? "saving" : ""}`}
              >
                {saving ? (
                  <>
                    <Loader2 size={22} className="spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={22} />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>

          {/* INFO EXTRA */}
          <div className="pf-info-card">
            <h3>¿Por qué completar tu perfil?</h3>
            <ul>
              <li>Agilizamos tus envíos con datos precargados</li>
              <li>Te enviamos promociones exclusivas</li>
              <li>Mejoramos tu experiencia de compra</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default Perfil;