import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function RestaurangVy() {
  const { slug } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState(slug || "campino");

  useEffect(() => {
    fetchOrders();
  }, [selectedRestaurant, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({ slug: selectedRestaurant });
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`${BASE_URL}/api/admin/orders?${params}`, {
        credentials: "include",
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

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte uppdatera status");
      }

      // Uppdatera lokal state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      alert(`Fel: ${err.message}`);
    }
  };

  const getStatusButtons = (order) => {
    switch (order.status) {
      case "received":
        return (
          <button
            onClick={() => updateOrderStatus(order.id, "accepted")}
            className="status-button accept"
            aria-label="Acceptera order"
          >
            Acceptera order
          </button>
        );
      case "accepted":
        return (
          <button
            onClick={() => updateOrderStatus(order.id, "in_progress")}
            className="status-button progress"
            aria-label="Påbörja tillverkning"
          >
            Påbörja tillverkning
          </button>
        );
      case "in_progress":
        return (
          <button
            onClick={() => updateOrderStatus(order.id, "out_for_delivery")}
            className="status-button delivery"
            aria-label="Skicka ut order"
          >
            Skicka ut order
          </button>
        );
      default:
        return <span className="status-complete">Slutförd</span>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "received": return "#ff6b6b";
      case "accepted": return "#4ecdc4";
      case "in_progress": return "#45b7d1";
      case "out_for_delivery": return "#f9ca24";
      case "delivered": return "#6c5ce7";
      default: return "#ddd";
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("sv-SE");
  };

  const formatPrice = (priceInOre) => {
    return (priceInOre / 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="restaurant-view">
        <div className="loading">Laddar ordrar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="restaurant-view">
        <div className="error">Fel: {error}</div>
      </div>
    );
  }

  return (
    <div className="restaurant-view">
      <div className="restaurant-header">
        <h1>Restaurangvy - {selectedRestaurant}</h1>
        
        {/* Restaurant selector for admin */}
        {!slug && (
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="restaurant-select">Välj restaurang:</label>
            <select 
              id="restaurant-select"
              value={selectedRestaurant} 
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              style={{ marginLeft: "0.5rem", padding: "0.5rem" }}
            >
              <option value="campino">Campino</option>
              <option value="sunsushi">SunSushi</option>
            </select>
          </div>
        )}
        
        <div className="filter-buttons">
          <button
            onClick={() => setStatusFilter("all")}
            className={statusFilter === "all" ? "active" : ""}
            aria-label="Visa alla ordrar"
          >
            Alla
          </button>
          <button
            onClick={() => setStatusFilter("received")}
            className={statusFilter === "received" ? "active" : ""}
            aria-label="Visa nya ordrar"
          >
            Nya
          </button>
          <button
            onClick={() => setStatusFilter("accepted")}
            className={statusFilter === "accepted" ? "active" : ""}
            aria-label="Visa accepterade ordrar"
          >
            Accepterade
          </button>
          <button
            onClick={() => setStatusFilter("in_progress")}
            className={statusFilter === "in_progress" ? "active" : ""}
            aria-label="Visa pågående ordrar"
          >
            Pågående
          </button>
          <button
            onClick={() => setStatusFilter("out_for_delivery")}
            className={statusFilter === "out_for_delivery" ? "active" : ""}
            aria-label="Visa ordrar ute för leverans"
          >
            Ute för leverans
          </button>
        </div>
      </div>

      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="no-orders">Inga ordrar att visa</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <h3>Order #{order.id}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status}
                </span>
              </div>

              <div className="customer-info">
                <h4>{order.customer_name}</h4>
                <p>📞 {order.customer_phone}</p>
                <p>📍 {order.customer_address}</p>
              </div>

              <div className="order-details">
                <p><strong>Total:</strong> {formatPrice(order.grand_total)} kr</p>
                <p><strong>Beställt:</strong> {formatTime(order.created_at)}</p>
                {order.items && order.items.length > 0 && (
                  <div className="order-items">
                    <h5>Varor:</h5>
                    <ul>
                      {order.items.map((item, index) => (
                        <li key={index}>
                          {item.name} x{item.quantity} - {formatPrice(item.line_total)} kr
                          {item.options && item.options.length > 0 && (
                            <ul style={{ marginLeft: '1rem', fontSize: '0.9em' }}>
                              {item.options.map((option, optIndex) => (
                                <li key={optIndex}>
                                  + {option.label}
                                  {option.price_delta !== 0 && (
                                    ` (${option.price_delta > 0 ? '+' : ''}${formatPrice(option.price_delta)} kr)`
                                  )}
                                  {option.custom_note && (
                                    <span style={{ fontStyle: 'italic', color: '#666' }}>
                                      {' '}- "{option.custom_note}"
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="order-actions">
                {getStatusButtons(order)}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .restaurant-view {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .restaurant-header {
          margin-bottom: 2rem;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .filter-buttons button {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          border-radius: 4px;
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

        .order-details {
          margin-bottom: 1rem;
        }

        .order-items {
          margin-top: 0.5rem;
        }

        .order-items ul {
          margin: 0.5rem 0;
          padding-left: 1rem;
        }

        .order-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .status-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          color: white;
        }

        .status-button.accept {
          background: #28a745;
        }

        .status-button.progress {
          background: #007bff;
        }

        .status-button.delivery {
          background: #ffc107;
          color: #000;
        }

        .status-complete {
          padding: 0.5rem 1rem;
          background: #6c5ce7;
          color: white;
          border-radius: 4px;
          font-weight: bold;
        }

        .loading, .error, .no-orders {
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
        }

        .error {
          color: #dc3545;
        }

        @media (max-width: 768px) {
          .orders-list {
            grid-template-columns: 1fr;
          }
          
          .filter-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default RestaurangVy;
