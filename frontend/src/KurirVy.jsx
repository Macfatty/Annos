import { useState, useEffect } from "react";

function KurirVy() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      
      const response = await fetch(`/api/courier/orders?status=${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Kunde inte hämta ordrar");
      }

      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      const token = localStorage.getItem("accessToken");
      
      const response = await fetch(`/api/courier/orders/${orderId}/accept`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte acceptera order");
      }

      // Uppdatera lokal state - ta bort från pending och lägg till i mine
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      // Om vi visar "pending", hämta om listan
      if (filter === "pending") {
        fetchOrders();
      }
    } catch (err) {
      alert(`Fel: ${err.message}`);
    }
  };

  const deliverOrder = async (orderId) => {
    try {
      const token = localStorage.getItem("accessToken");
      
      const response = await fetch(`/api/courier/orders/${orderId}/delivered`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte markera som levererad");
      }

      // Uppdatera lokal state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: "delivered" } : order
        )
      );
    } catch (err) {
      alert(`Fel: ${err.message}`);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("sv-SE");
  };

  const formatPrice = (priceInOre) => {
    return (priceInOre / 100).toFixed(2);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "out_for_delivery": return "#ffc107";
      case "delivered": return "#28a745";
      default: return "#ddd";
    }
  };

  if (loading) {
    return (
      <div className="courier-view">
        <div className="loading">Laddar ordrar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="courier-view">
        <div className="error">Fel: {error}</div>
      </div>
    );
  }

  return (
    <div className="courier-view">
      <div className="courier-header">
        <h1>Kurirvy</h1>
        
        <div className="filter-buttons">
          <button
            onClick={() => setFilter("pending")}
            className={filter === "pending" ? "active" : ""}
            aria-label="Visa nya ordrar"
          >
            Nya ordrar
          </button>
          <button
            onClick={() => setFilter("mine")}
            className={filter === "mine" ? "active" : ""}
            aria-label="Visa mina ordrar"
          >
            Mina ordrar
          </button>
        </div>
      </div>

      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="no-orders">
            {filter === "pending" ? "Inga nya ordrar tillgängliga" : "Inga pågående ordrar"}
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <h3>Order #{order.id}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status === "out_for_delivery" ? "Ute för leverans" : "Levererad"}
                </span>
              </div>

              <div className="customer-info">
                <h4>{order.customer_name}</h4>
                <p>📍 {order.customer_address}</p>
                <p>📞 {order.customer_phone}</p>
              </div>

              <div className="order-details">
                <p><strong>Restaurang:</strong> {order.restaurant_slug}</p>
                <p><strong>Total:</strong> {formatPrice(order.grand_total)} kr</p>
                <p><strong>Beställt:</strong> {formatTime(order.created_at)}</p>
              </div>

              <div className="order-actions">
                {filter === "pending" && (
                  <button
                    onClick={() => acceptOrder(order.id)}
                    className="accept-button"
                    aria-label="Acceptera order"
                  >
                    Acceptera order
                  </button>
                )}
                
                {filter === "mine" && order.status === "out_for_delivery" && (
                  <button
                    onClick={() => deliverOrder(order.id)}
                    className="deliver-button"
                    aria-label="Markera som levererad"
                  >
                    Order levererad
                  </button>
                )}

                {filter === "mine" && order.status === "delivered" && (
                  <span className="delivered-status">
                    ✅ Levererad
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .courier-view {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .courier-header {
          margin-bottom: 2rem;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          justify-content: center;
        }

        .filter-buttons button {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          border-radius: 4px;
          font-weight: bold;
        }

        .filter-buttons button.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .orders-list {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        .order-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: white;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
        }

        .customer-info {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .customer-info h4 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .customer-info p {
          margin: 0.25rem 0;
          color: #666;
        }

        .order-details {
          margin-bottom: 1rem;
        }

        .order-details p {
          margin: 0.25rem 0;
        }

        .order-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .accept-button {
          padding: 0.75rem 1.5rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1rem;
        }

        .accept-button:hover {
          background: #218838;
        }

        .deliver-button {
          padding: 0.75rem 1.5rem;
          background: #ffc107;
          color: #000;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1rem;
        }

        .deliver-button:hover {
          background: #e0a800;
        }

        .delivered-status {
          padding: 0.75rem 1.5rem;
          background: #28a745;
          color: white;
          border-radius: 4px;
          font-weight: bold;
          font-size: 1rem;
        }

        .loading, .error, .no-orders {
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
        }

        .error {
          color: #dc3545;
        }

        .no-orders {
          color: #666;
        }

        @media (max-width: 768px) {
          .orders-list {
            grid-template-columns: 1fr;
          }
          
          .filter-buttons {
            flex-direction: column;
            align-items: center;
          }

          .filter-buttons button {
            width: 200px;
          }

          .order-actions {
            justify-content: center;
          }

          .accept-button,
          .deliver-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default KurirVy;