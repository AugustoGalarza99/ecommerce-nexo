// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import "./Dashboard.css";

function Dashboard() {
  const [totalSales, setTotalSales] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [bestSellers, setBestSellers] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const querySnapshot = await getDocs(collection(db, "products"));
      let sales = 0;
      let stock = 0;
      let products = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sales += (data.sales || 0) * data.price;
        stock += data.stock;
        products.push({ name: data.name, sales: data.sales || 0 });
      });

      setTotalSales(sales);
      setTotalStock(stock);
      setBestSellers(products.sort((a, b) => b.sales - a.sales).slice(0, 3));
    };

    fetchMetrics();
  }, []);

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="metrics">
        <div className="card">
          <h3>Total Ventas</h3>
          <p>${totalSales.toFixed(2)}</p>
        </div>
        <div className="card">
          <h3>Stock Disponible</h3>
          <p>{totalStock} unidades</p>
        </div>
        <div className="card">
          <h3>Más Vendidos</h3>
          <ul>
            {bestSellers.map((product, index) => (
              <li key={index}>{product.name} - {product.sales} ventas</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
