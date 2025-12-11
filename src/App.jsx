import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminDashboard from "./components/Administracion/Administracion";
import GestorProductos from "./components/GestorProductos/GestorProductos";
import Dashboard from "./components/Dashboard/Dashboard";
import Home from "./components/Home/Home";
import Productos from "./components/Productos/Productos";
import ProductDetail from "./components/ProductDetail/ProductDetail";
import Navbar from "./components/Navbar/Navbar";
import { CartProvider } from "./context/CartContext";
import Login from "./components/Login/Login";
import Perfil from "./components/Perfil/Perfil";
import Cart from "./components/Cart/Cart";
import Pedidos from "./components/Pedidos/Pedidos";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import AdminBanner from "./components/AdminBanner/AdminBanner";
import Clientes from "./components/Clientes/Clientes";
import Estadisticas from "./components/Estadisticas/Estadisticas";
import Promociones from "./components/Promociones/Promociones";
import GestorCategorias from "./components/GestorCategorias/GestorCategorias";
import CheckoutSuccess from "./components/MercadoPago/CheckoutSuccess/CheckoutSuccess";
import CheckoutFailure from "./components/MercadoPago/CheckoutFailure/CheckoutFailure";
import CheckoutPending from "./components/MercadoPago/CheckoutPending/CheckoutPending";

function App() {
  return (
    <CartProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Rutas protegidas solo para ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/productos"
            element={
              <ProtectedRoute requiredRole="admin">
                <GestorProductos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categorias"
            element={
              <ProtectedRoute requiredRole="admin">
                <GestorCategorias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pedidos"
            element={
              <ProtectedRoute requiredRole="admin">
                <Pedidos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clientes"
            element={
              <ProtectedRoute requiredRole="admin">
                <Clientes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/estadisticas"
            element={
              <ProtectedRoute requiredRole="admin">
                <Estadisticas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promociones"
            element={
              <ProtectedRoute requiredRole="admin">
                <Promociones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fotosbanner"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminBanner />
              </ProtectedRoute>
            }
          />

          {/* Rutas accesibles para todos */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/cart" element={<Cart />} />

          <Route path="/success" element={<CheckoutSuccess />}/>
          <Route path="/failure" element={<CheckoutFailure />} />
          <Route path="/pending" element={<CheckoutPending />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
