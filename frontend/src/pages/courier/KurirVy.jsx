import { useState, useEffect, useCallback } from "react";
import "./KurirVy.css";
import { fetchCourierOrders, acceptOrder, markOrderAsDelivered } from "../../services/api";

function KurirVy() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("pending");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const statusFilter = filter !== "all" ? filter : null;
      const data = await fetchCourierOrders(statusFilter);
      setOrders(data);
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
      in_progress: "Pågår",
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
            className={filter === "pending" ? "active" : ""}
            onClick={() => setFilter("pending")}
          >
            Väntande ordrar
          </button>
          <button 
            className={filter === "accepted" ? "active" : ""}
            onClick={() => setFilter("accepted")}
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
                {order.status === "pending" && (
                  <button 
                    className="primary accept-button"
                    onClick={() => handleAcceptOrder(order.id)}
                  >
                    Acceptera order
                  </button>
                )}
                
                {order.status === "accepted" && (
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