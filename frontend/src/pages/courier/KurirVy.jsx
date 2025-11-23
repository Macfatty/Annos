import { useState, useEffect, useCallback } from "react";
import "./KurirVy.css";
import { fetchCourierOrders, acceptOrder, markOrderAsDelivered, updateAdminOrderStatus } from "../../services/api";

function KurirVy() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("available");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCourierOrders(null); // Hämta alla courier orders

      // Filter baserat på vald vy
      let filteredOrders = data;
      if (filter === "available") {
        // Tillgängliga orders: ready_for_pickup
        filteredOrders = data.filter(order => order.status === "ready_for_pickup");
      } else if (filter === "my_orders") {
        // Mina orders: assigned, out_for_delivery
        filteredOrders = data.filter(order =>
          ["assigned", "out_for_delivery"].includes(order.status)
        );
      }

      setOrders(filteredOrders);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleAcceptOrder = async (orderId) => {
    try {
      await acceptOrder(orderId);
      await loadOrders();
    } catch (err) {
      alert(`Fel: ${err.message}`);
    }
  };

  const handlePickupOrder = async (orderId) => {
    try {
      await updateAdminOrderStatus(orderId, "out_for_delivery");
      await loadOrders();
    } catch (err) {
      alert(`Fel: ${err.message}`);
    }
  };

  const handleDeliverOrder = async (orderId) => {
    try {
      await markOrderAsDelivered(orderId);
      await loadOrders();
    } catch (err) {
      alert(`Fel: ${err.message}`);
    }
  };

  const formatPrice = (priceInOre) => {
    return (priceInOre / 100).toFixed(2);
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      received: "Mottagen",
      accepted: "Accepterad",
      ready_for_pickup: "Klar för hämtning",
      assigned: "Tilldelad",
      out_for_delivery: "Ute för leverans",
      delivered: "Levererad"
    };
    return statusMap[status] || status;
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
            className={filter === "available" ? "active" : ""}
            onClick={() => setFilter("available")}
          >
            Tillgängliga ordrar
          </button>
          <button
            className={filter === "my_orders" ? "active" : ""}
            onClick={() => setFilter("my_orders")}
          >
            Mina ordrar
          </button>
        </div>
      </div>

      <div className="orders-container">
        {orders.length === 0 ? (
          <div className="loading">Inga ordrar hittades</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span className="order-id">Order #{order.id}</span>
                <span className={`order-status ${order.status}`}>
                  {getStatusDisplay(order.status)}
                </span>
              </div>

              <div className="customer-info">
                <h4>{order.customer_name}</h4>
                <p>📞 {order.customer_phone}</p>
                <p>📍 {order.customer_address}</p>
                {order.customer_email && <p>📧 {order.customer_email}</p>}
              </div>

              <div className="order-items">
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{formatPrice(item.line_total)} kr</span>
                  </div>
                ))}
              </div>

              <div className="order-total">
                <span>Totalt:</span>
                <span>{formatPrice(order.grand_total)} kr</span>
              </div>

              <div className="order-actions">
                {order.status === "ready_for_pickup" && (
                  <button
                    className="primary accept-button"
                    onClick={() => handleAcceptOrder(order.id)}
                  >
                    Acceptera order
                  </button>
                )}

                {order.status === "assigned" && (
                  <button
                    className="primary pickup-button"
                    onClick={() => handlePickupOrder(order.id)}
                  >
                    Hämtat order
                  </button>
                )}

                {order.status === "out_for_delivery" && (
                  <button
                    className="primary deliver-button"
                    onClick={() => handleDeliverOrder(order.id)}
                  >
                    Markera som levererad
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default KurirVy;