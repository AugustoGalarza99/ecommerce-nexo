import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaGoogle, FaEnvelope, FaLock } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: "user",
          photoURL: user.photoURL || "",
        });
      }

      localStorage.setItem("user", JSON.stringify(user));
      navigate("/perfil");
    } catch (err) {
      setError("Error al iniciar sesión: " + err.message);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("user", JSON.stringify(userCredential.user));
      navigate("/perfil");
    } catch (err) {
      setError("Error al iniciar sesión: " + err.message);
    }
  };

  return (
    <div className="form">
      <h2>Iniciar Sesión</h2>

      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleEmailLogin}>
        <div className="flex-column">
          <label>Email</label>
          <div className="inputForm">
            <FaEnvelope className="icon" />
            <input 
              type="email" 
              className="input"
              placeholder="Ingresa tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex-column">
          <label>Contraseña</label>
          <div className="inputForm">
            <FaLock className="icon" />
            <input 
              type="password"
              className="input"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="button-submit">Ingresar</button>
      </form>

      <p className="p">O inicia sesión con</p>

      <button className="btn" onClick={handleGoogleLogin}>
        <FcGoogle className="google-icon" />
        Iniciar sesión con Google
      </button>
    </div>
  );
}

export default Login;
