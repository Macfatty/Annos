import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./RestaurangVy.css";
import { fetchAdminOrders, updateAdminOrderStatus } from "../../services/api";

function RestaurangVy() {
  const { slug } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState(slug || "campino");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const filterStatus = statusFilter !== "all" ? statusFilter : null;
      const data = await fetchAdminOrders(selectedRestaurant, filterStatus);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedRestaurant, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [selectedRestaurant, statusFilter, fetchOrders]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateAdminOrderStatus(orderId, newStatus);

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
            onClick={() => handleUpdateOrderStatus(order.id, "accepted")}
            className="status-button accept"
            aria-label="Acceptera order"
          >
            Acceptera order
          </button>
        );
      case "accepted":
        return (
          <button
            onClick={() => handleUpdateOrderStatus(order.id, "in_progress")}
            className="status-button progress"
            aria-label="Påbörja tillverkning"
          >
            Påbörja tillverkning
          </button>
        );
      case "in_progress":
        return (
          <button
            onClick={() => handleUpdateOrderStatus(order.id, "out_for_delivery")}
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
                            <ul style={{ marginLeft: "1rem", fontSize: "0.9em" }}>
                              {item.options.map((option, optIndex) => (
                                <li key={optIndex}>
                                  + {option.label}
                                  {option.price_delta !== 0 && (
                                    ` (${option.price_delta > 0 ? "+" : ""}${formatPrice(option.price_delta)} kr)`
                                  )}
                                  {option.custom_note && (
                                    <span style={{ fontStyle: "italic", color: "#666" }}>
                                      {" "}- "{option.custom_note}"
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
    </div>
  );
}

export default RestaurangVy;
