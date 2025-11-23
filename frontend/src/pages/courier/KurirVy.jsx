import { useState, useEffect, useCallback } from "react";
import "./KurirVy.css";
import { fetchCourierOrders, acceptOrder, markOrderAsDelivered, updateAdminOrderStatus } from "../../services/api";

function KurirVy() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("available"); // "available", "my_orders", "history"

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCourierOrders(null); // Hämta alla courier orders

      // Filter baserat på vald vy
      let filteredOrders = data;
      if (view === "available") {
        // Tillgängliga orders: ready_for_pickup
        filteredOrders = data.filter(order => order.status === "ready_for_pickup");
      } else if (view === "my_orders") {
        // Mina orders: assigned, out_for_delivery
        filteredOrders = data.filter(order =>
          ["assigned", "out_for_delivery"].includes(order.status)
        );
      } else if (view === "history") {
        // Historik: delivered orders
        filteredOrders = data.filter(order => order.status === "delivered");
      }

      setOrders(filteredOrders);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view]);

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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("sv-SE");
  };

  // Gruppera orders i 30-dagarsperioder för historik
  const groupOrdersBy30Days = (orders) => {
    const grouped = {};
    const now = new Date();

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

      // Bestäm vilken 30-dagarsperiod ordern tillhör
      const periodIndex = Math.floor(daysDiff / 30);
      const periodKey = `period-${periodIndex}`;

      // Skapa period-namn
      let periodName;
      if (periodIndex === 0) {
        periodName = "Senaste 30 dagarna";
      } else {
        const periodStart = periodIndex * 30;
        const periodEnd = (periodIndex + 1) * 30;
        periodName = `${periodStart}-${periodEnd} dagar sedan`;
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          periodName,
          periodIndex,
          orders: []
        };
      }

      grouped[periodKey].orders.push(order);
    });

    // Sortera perioder i stigande ordning (nyast först)
    return Object.entries(grouped).sort((a, b) => a[1].periodIndex - b[1].periodIndex);
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

  const groupedHistory = view === "history" ? groupOrdersBy30Days(orders) : null;

  return (
    <div className="courier-view">
      <div className="courier-header">
        <h1>Kurirvy</h1>

        <div className="filter-buttons">
          <button
            className={view === "available" ? "active" : ""}
            onClick={() => setView("available")}
          >
            Tillgängliga ordrar
          </button>
          <button
            className={view === "my_orders" ? "active" : ""}
            onClick={() => setView("my_orders")}
          >
            Mina ordrar
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            Historik
          </button>
        </div>
      </div>

      <div className="orders-container">
        {view === "history" ? (
          // Historik-vy grupperad per 30-dagarsperiod
          groupedHistory && groupedHistory.length > 0 ? (
            groupedHistory.map(([periodKey, { periodName, orders: periodOrders }]) => (
              <div key={periodKey} className="history-period-group">
                <h2 className="period-header">{periodName}</h2>
                <div className="period-orders">
                  {periodOrders.map((order) => (
                    <div key={order.id} className="order-card history-order">
                      <div className="order-header">
                        <div>
                          <span className="order-id">Order #{order.id}</span>
                          <p className="order-date">{formatTime(order.created_at)}</p>
                        </div>
                        <span className={`order-status ${order.status}`}>
                          {getStatusDisplay(order.status)}
                        </span>
                      </div>

                      <div className="customer-info">
                        <h4>{order.customer_name}</h4>
                        <p>📞 {order.customer_phone}</p>
                        <p>📍 {order.customer_address}</p>
                        {order.customer_email && <p>📧 {order.customer_email}</p>}
                        {order.customer_notes && (
                          <p className="customer-notes">
                            <strong>💬 Meddelande:</strong> {order.customer_notes}
                          </p>
                        )}
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
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="loading">Inga historiska ordrar att visa</div>
          )
        ) : (
          // Aktiva ordrar-vy
          orders.length === 0 ? (
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
                  {order.customer_notes && (
                    <p className="customer-notes">
                      <strong>💬 Meddelande:</strong> {order.customer_notes}
                    </p>
                  )}
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
          )
        )}
      </div>
    </div>
  );
}

export default KurirVy;
