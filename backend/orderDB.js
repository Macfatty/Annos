const pool = require("./db");

// PostgreSQL-specifika funktioner för orderhantering

// Hämta dagens ordrar för en specifik restaurang
function hamtaDagensOrdrar(restaurant_slug, callback) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();
  
  const query = `
    SELECT o.*, 
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'line_total', oi.line_total,
                 'options', COALESCE(opt.options, '[]'::json)
               )
             ) FILTER (WHERE oi.id IS NOT NULL), 
             '[]'::json
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', oio.id,
          'typ', oio.typ,
          'label', oio.label,
          'price_delta', oio.price_delta,
          'custom_note', oio.custom_note
        )
      ) as options
      FROM order_item_options oio
      WHERE oio.order_item_id = oi.id
    ) opt ON true
    WHERE o.restaurant_slug = $1 
      AND o.created_at >= $2
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  
  pool.query(query, [restaurant_slug, todayStart], (err, result) => {
    if (err) {
      console.error("Fel vid hämtning av dagens ordrar:", err);
      return callback(err, null);
    }
    callback(null, result.rows);
  });
}

// Hämta alla dagens ordrar (för admin)
function hamtaAllaDagensOrdrar(callback) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();
  
  const query = `
    SELECT o.*, 
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'line_total', oi.line_total,
                 'options', COALESCE(opt.options, '[]'::json)
               )
             ) FILTER (WHERE oi.id IS NOT NULL), 
             '[]'::json
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', oio.id,
          'typ', oio.typ,
          'label', oio.label,
          'price_delta', oio.price_delta,
          'custom_note', oio.custom_note
        )
      ) as options
      FROM order_item_options oio
      WHERE oio.order_item_id = oi.id
    ) opt ON true
    WHERE o.created_at >= $1
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  
  pool.query(query, [todayStart], (err, result) => {
    if (err) {
      console.error("Fel vid hämtning av alla dagens ordrar:", err);
      return callback(err, null);
    }
    callback(null, result.rows);
  });
}

// Hämta senaste order
function hamtaSenasteOrder(callback) {
  const query = `
    SELECT * FROM orders 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  
  pool.query(query, (err, result) => {
    if (err) {
      console.error("Fel vid hämtning av senaste order:", err);
      return callback(err, null);
    }
    callback(null, result.rows[0] || null);
  });
}

// Markera order som klar
function markeraOrderSomKlar(orderId, callback) {
  const query = `
    UPDATE orders 
    SET status = 'delivered', 
        delivered_at = $1,
        updated_at = $1
    WHERE id = $2
  `;
  
  const now = new Date().toISOString();
  pool.query(query, [now, orderId], (err, result) => {
    if (err) {
      console.error("Fel vid markering av order som klar:", err);
      return callback(err);
    }
    callback(null);
  });
}

// Hämta ordrar med status
function hamtaOrdrarMedStatus(restaurant_slug, status, callback) {
  const query = `
    SELECT o.*, 
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'line_total', oi.line_total,
                 'options', COALESCE(opt.options, '[]'::json)
               )
             ) FILTER (WHERE oi.id IS NOT NULL), 
             '[]'::json
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', oio.id,
          'typ', oio.typ,
          'label', oio.label,
          'price_delta', oio.price_delta,
          'custom_note', oio.custom_note
        )
      ) as options
      FROM order_item_options oio
      WHERE oio.order_item_id = oi.id
    ) opt ON true
    WHERE o.restaurant_slug = $1 AND o.status = $2
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  
  pool.query(query, [restaurant_slug, status], (err, result) => {
    if (err) {
      console.error("Fel vid hämtning av ordrar med status:", err);
      return callback(err, null);
    }
    callback(null, result.rows);
  });
}

// Uppdatera orderstatus
function uppdateraOrderStatus(orderId, newStatus, callback) {
  const query = `
    UPDATE orders 
    SET status = $1, updated_at = $2
    WHERE id = $3
  `;
  
  const now = new Date().toISOString();
  pool.query(query, [newStatus, now, orderId], (err, result) => {
    if (err) {
      console.error("Fel vid uppdatering av orderstatus:", err);
      return callback(err);
    }
    callback(null);
  });
}

// Hämta order med detaljer
function hamtaOrderMedDetaljer(orderId, callback) {
  const query = `
    SELECT o.*, 
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'line_total', oi.line_total,
                 'options', COALESCE(opt.options, '[]'::json)
               )
             ) FILTER (WHERE oi.id IS NOT NULL), 
             '[]'::json
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', oio.id,
          'typ', oio.typ,
          'label', oio.label,
          'price_delta', oio.price_delta,
          'custom_note', oio.custom_note
        )
      ) as options
      FROM order_item_options oio
      WHERE oio.order_item_id = oi.id
    ) opt ON true
    WHERE o.id = $1
    GROUP BY o.id
  `;
  
  pool.query(query, [orderId], (err, result) => {
    if (err) {
      console.error("Fel vid hämtning av order med detaljer:", err);
      return callback(err, null);
    }
    callback(null, result.rows[0] || null);
  });
}

// Hämta kurirordrar
// DEPRECATED: Use OrderService.getCourierOrders() instead
function hamtaKurirOrdrar(status, courierId, callback) {
  console.warn('DEPRECATED: hamtaKurirOrdrar() is deprecated. Use OrderService.getCourierOrders() instead.');

  let query = `
    SELECT o.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'line_total', oi.line_total,
                 'options', COALESCE(opt.options, '[]'::json)
               )
             ) FILTER (WHERE oi.id IS NOT NULL),
             '[]'::json
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', oio.id,
          'typ', oio.typ,
          'label', oio.label,
          'price_delta', oio.price_delta,
          'custom_note', oio.custom_note
        )
      ) as options
      FROM order_item_options oio
      WHERE oio.order_item_id = oi.id
    ) opt ON true
    WHERE o.status = $1
  `;

  const params = [status];

  if (courierId && status !== 'pending') {
    query += ` AND o.assigned_courier_id = $2`;
    params.push(courierId);
  }

  query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

  pool.query(query, params, (err, result) => {
    if (err) {
      console.error("Fel vid hämtning av kurirordrar:", err);
      return callback(err, null);
    }
    callback(null, result.rows);
  });
}

// Tilldela order till kurir
// DEPRECATED: Use OrderService.assignCourierToOrder() instead
function tilldelaOrderTillKurir(orderId, courierId, callback) {
  console.warn('DEPRECATED: tilldelaOrderTillKurir() is deprecated. Use OrderService.assignCourierToOrder() instead.');

  const query = `
    UPDATE orders
    SET assigned_courier_id = $1,
        status = 'out_for_delivery',
        updated_at = $2
    WHERE id = $3
  `;

  const now = new Date().toISOString();
  pool.query(query, [courierId, now, orderId], (err, result) => {
    if (err) {
      console.error("Fel vid tilldelning av order till kurir:", err);
      return callback(err);
    }
    callback(null);
  });
}

// Markera order som levererad
// DEPRECATED: Use OrderService.markOrderAsDelivered() instead
function markeraOrderSomLevererad(orderId, callback) {
  console.warn('DEPRECATED: markeraOrderSomLevererad() is deprecated. Use OrderService.markOrderAsDelivered() instead.');

  const query = `
    UPDATE orders
    SET status = 'delivered',
        delivered_at = $1,
        updated_at = $1
    WHERE id = $2
  `;

  const now = new Date().toISOString();
  pool.query(query, [now, orderId], (err, result) => {
    if (err) {
      console.error("Fel vid markering av order som levererad:", err);
      return callback(err);
    }
    callback(null);
  });
}

// Exportera funktioner och pool för kompatibilitet
module.exports = {
  hamtaDagensOrdrar,
  hamtaAllaDagensOrdrar,
  hamtaSenasteOrder,
  markeraOrderSomKlar,
  hamtaOrdrarMedStatus,
  uppdateraOrderStatus,
  hamtaOrderMedDetaljer,
  hamtaKurirOrdrar,
  tilldelaOrderTillKurir,
  markeraOrderSomLevererad,
  db: pool // För bakåtkompatibilitet
};