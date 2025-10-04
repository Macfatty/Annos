const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { verifyJWT, verifyToken, verifyRole, verifyAdminForSlug, rateLimit, isValidStatusTransition } = require("./authMiddleware");
const { createPaymentProvider, validatePaymentRequest, logPaymentActivity } = require("./payments");
const { body, validationResult } = require("express-validator");
const dotenv = require("dotenv");
const authRouter = require("./routes/auth");
const { ensureAssignedCourierId } = require("./migrateDatabase");

const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true,
};

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const meny = require("./Data/menuData.js");
const tillbehor = require("./Data/tillbehorData.js");
const {
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
  db,
} = require("./orderDB");
const pool = require("./db");

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' https://apis.google.com https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' https://your-api.com https://*.stripe.com; " +
      "frame-src https://js.stripe.com;"
  );
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Använd auth-router
app.use("/api/auth", authRouter);

// Test-endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend fungerar!" });
});

// ========================================
// NYA MENY-ENDPOINTS (ENKLA VERSIONER)
// ========================================

// Hämta alla restauranger
app.get("/api/menu/restaurants", (req, res) => {
  try {
    const restaurants = Object.keys(meny).map(slug => ({
      slug,
      name: slug === 'campino' ? 'Campino' : slug === 'sunsushi' ? 'SunSushi' : slug,
      description: slug === 'campino' ? 'Italiensk pizza och pasta' : 
                   slug === 'sunsushi' ? 'Japansk sushi och asiatisk mat' : 'Restaurang'
    }));

    res.json({
      success: true,
      data: restaurants
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hämta meny för specifik restaurang
app.get("/api/menu/:slug", (req, res) => {
  try {
    const { slug } = req.params;
    const menu = meny[slug];

    if (!menu) {
      return res.status(404).json({ 
        success: false,
        error: "Restaurang inte hittad" 
      });
    }

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hämta tillbehör för specifik restaurang
app.get("/api/menu/:slug/accessories", (req, res) => {
  try {
    const { slug } = req.params;
    const accessories = tillbehor[slug];

    if (!accessories) {
      return res.status(404).json({ 
        success: false,
        error: "Tillbehör inte hittat" 
      });
    }

    res.json({
      success: true,
      data: accessories
    });
  } catch (error) {
    console.error('Get accessories error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Sök i meny
app.get("/api/menu/:slug/search", (req, res) => {
  try {
    const { slug } = req.params;
    const { q } = req.query;
    const menu = meny[slug];

    if (!menu) {
      return res.status(404).json({ 
        success: false,
        error: "Restaurang inte hittad" 
      });
    }

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const searchTerm = q.toLowerCase();
    const filteredMenu = menu.filter(item => 
      item.namn.toLowerCase().includes(searchTerm) ||
      item.beskrivning.toLowerCase().includes(searchTerm)
    );

    res.json({
      success: true,
      data: filteredMenu
    });
  } catch (error) {
    console.error('Search menu error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hämta kategorier
app.get("/api/menu/:slug/categories", (req, res) => {
  try {
    const { slug } = req.params;
    const menu = meny[slug];

    if (!menu) {
      return res.status(404).json({ 
        success: false,
        error: "Restaurang inte hittad" 
      });
    }

    const categories = [...new Set(menu.map(item => item.kategori))];
    const filteredCategories = categories.filter(Boolean);

    res.json({
      success: true,
      data: filteredCategories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hämta meny efter kategori
app.get("/api/menu/:slug/category/:category", (req, res) => {
  try {
    const { slug, category } = req.params;
    const menu = meny[slug];

    if (!menu) {
      return res.status(404).json({ 
        success: false,
        error: "Restaurang inte hittad" 
      });
    }

    const filteredMenu = menu.filter(item => item.kategori === category);

    res.json({
      success: true,
      data: filteredMenu
    });
  } catch (error) {
    console.error('Get menu by category error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hämta specifik meny-item
app.get("/api/menu/:slug/item/:itemId", (req, res) => {
  try {
    const { slug, itemId } = req.params;
    const menu = meny[slug];

    if (!menu) {
      return res.status(404).json({ 
        success: false,
        error: "Restaurang inte hittad" 
      });
    }

    const item = menu.find(item => item.id === parseInt(itemId));
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Menu item not found"
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hämta tillbehör efter typ
app.get("/api/menu/:slug/accessories/type/:type", (req, res) => {
  try {
    const { slug, type } = req.params;
    const accessories = tillbehor[slug];

    if (!accessories) {
      return res.status(404).json({ 
        success: false,
        error: "Tillbehör inte hittat" 
      });
    }

    const filteredAccessories = accessories.filter(item => item.typ === type);

    res.json({
      success: true,
      data: filteredAccessories
    });
  } catch (error) {
    console.error('Get accessories by type error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hämta grupperade tillbehör
app.get("/api/menu/:slug/accessories/grouped", (req, res) => {
  try {
    const { slug } = req.params;
    const accessories = tillbehor[slug];

    if (!accessories) {
      return res.status(404).json({ 
        success: false,
        error: "Tillbehör inte hittat" 
      });
    }

    const groupedAccessories = accessories.reduce((acc, item) => {
      const type = item.typ || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedAccessories
    });
  } catch (error) {
    console.error('Get grouped accessories error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// ========================================
// GAMLA MENY-ENDPOINTS (FÖR BAKÅTKOMPATIBILITET)
// ========================================

// Hämta meny-data
app.get("/api/meny/:restaurang", (req, res) => {
  const { restaurang } = req.params;
  const restaurangData = meny[restaurang];

  if (!restaurangData) {
    return res.status(404).json({ error: "Restaurang inte hittad" });
  }

  res.json(restaurangData);
});

// Alternativ meny-endpoint för kompatibilitet
app.get("/api/meny", (req, res) => {
  const restaurang = req.query.restaurang || "campino";
  const valdMeny = meny[restaurang];
  
  if (!valdMeny) {
    return res.status(404).json({ message: "Meny ej hittad" });
  }
  
  res.json(valdMeny);
});

// Hämta tillbehör-data
app.get("/api/tillbehor/:restaurang", (req, res) => {
  const { restaurang } = req.params;
  const tillbehorData = tillbehor[restaurang];

  if (!tillbehorData) {
    return res.status(404).json({ error: "Tillbehör inte hittat" });
  }

  res.json(tillbehorData);
});

// ========================================
// RESTEN AV ENDPOINTS (OFÖRÄNDRADE)
// ========================================

// Hämta profil
app.get("/api/profile", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, email, namn, telefon, adress, role FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Användare inte hittad" });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        namn: user.namn || "",
        telefon: user.telefon || "",
        adress: user.adress || "",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Profil-hämtning fel:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Uppdatera profil
app.put("/api/profile", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { namn, telefon, adress } = req.body;

    const result = await pool.query(
      "UPDATE users SET namn = $1, telefon = $2, adress = $3 WHERE id = $4 RETURNING *",
      [namn, telefon, adress, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Användare inte hittad" });
    }

    res.json({
      success: true,
      message: "Profil uppdaterad",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Profil-uppdatering fel:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Skapa beställning
app.post("/api/order", async (req, res) => {
  try {
    const {
      restaurant_slug,
      customer_name,
      customer_phone,
      customer_address,
      customer_email,
      items_total,
      delivery_fee = 0,
      discount_total = 0,
      grand_total,
      customer_notes = "",
      order_json,
      payment_method = "mock",
      payment_status = "pending",
    } = req.body;

    // Validera obligatoriska fält
    if (!restaurant_slug || !customer_name || !customer_phone || !customer_address || !customer_email || !grand_total) {
      return res.status(400).json({
        success: false,
        message: "Saknade obligatoriska fält",
      });
    }

    // Skapa beställning i databasen
    const orderResult = await pool.query(
      `INSERT INTO orders (
        restaurant_slug, customer_name, customer_phone, customer_address, 
        customer_email, items_total, delivery_fee, discount_total, 
        grand_total, customer_notes, order_json, payment_method, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at`,
      [
        restaurant_slug,
        customer_name,
        customer_phone,
        customer_address,
        customer_email,
        items_total,
        delivery_fee,
        discount_total,
        grand_total,
        customer_notes,
        JSON.stringify(order_json),
        payment_method,
        payment_status,
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Skapa order items
    if (order_json && order_json.items) {
      for (const item of order_json.items) {
        const itemResult = await pool.query(
          `INSERT INTO order_items (order_id, name, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [orderId, item.name, item.quantity, item.price, item.total]
        );

        const orderItemId = itemResult.rows[0].id;

        // Skapa order item options
        if (item.options && item.options.length > 0) {
          for (const option of item.options) {
            await pool.query(
              `INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                orderItemId,
                option.typ,
                option.label,
                option.price || 0,
                option.custom_note || null,
              ]
            );
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Beställning skapad",
      data: {
        orderId: orderId,
        created_at: orderResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Beställning skapande fel:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Hämta alla beställningar (admin)
app.get("/api/admin/orders", verifyJWT, verifyRole(["admin"]), async (req, res) => {
  try {
    const { slug, status } = req.query;
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
               ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN (
        SELECT oio.order_item_id,
               json_agg(
                 json_build_object(
                   'typ', oio.typ,
                   'label', oio.label,
                   'price_delta', oio.price_delta,
                   'custom_note', oio.custom_note
                 )
               ) as options
        FROM order_item_options oio
        GROUP BY oio.order_item_id
      ) opt ON oi.id = opt.order_item_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (slug) {
      query += ` AND o.restaurant_slug = $${paramCount}`;
      params.push(slug);
      paramCount++;
    }
    
    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += `
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Admin orders fel:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Hämta restaurang beställningar
app.get("/api/restaurant/orders", verifyJWT, verifyRole(["admin", "restaurant"]), async (req, res) => {
  try {
    const { slug, status } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Restaurant slug is required"
      });
    }

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
               ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN (
        SELECT oio.order_item_id,
               json_agg(
                 json_build_object(
                   'typ', oio.typ,
                   'label', oio.label,
                   'price_delta', oio.price_delta,
                   'custom_note', oio.custom_note
                 )
               ) as options
        FROM order_item_options oio
        GROUP BY oio.order_item_id
      ) opt ON oi.id = opt.order_item_id
      WHERE o.restaurant_slug = $1
    `;
    
    const params = [slug];
    
    if (status) {
      query += ' AND o.status = $2';
      params.push(status);
    }
    
    query += `
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Restaurant orders fel:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Hämta kurir beställningar
app.get("/api/courier/orders", verifyJWT, verifyRole(["admin", "courier"]), async (req, res) => {
  try {
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
               ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN (
        SELECT oio.order_item_id,
               json_agg(
                 json_build_object(
                   'typ', oio.typ,
                   'label', oio.label,
                   'price_delta', oio.price_delta,
                   'custom_note', oio.custom_note
                 )
               ) as options
        FROM order_item_options oio
        GROUP BY oio.order_item_id
      ) opt ON oi.id = opt.order_item_id
      WHERE o.status IN ('ready', 'assigned')
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `;

    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Courier orders fel:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Uppdatera order status
app.patch("/api/orders/:orderId/status", verifyJWT, verifyRole(["admin", "restaurant", "courier"]), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const validStatuses = ['received', 'preparing', 'ready', 'assigned', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    let query = 'UPDATE orders SET status = $1, updated_at = NOW()';
    const params = [status];
    let paramCount = 2;

    if (status === 'assigned' && userId) {
      query += `, assigned_courier_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (status === 'delivered') {
      query += ', delivered_at = NOW()';
    }

    query += ' WHERE id = $' + paramCount + ' RETURNING *';
    params.push(orderId);

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Markera order som klar (restaurang)
app.patch("/api/orders/:orderId/done", verifyJWT, verifyRole(["admin", "restaurant"]), async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(
      "UPDATE orders SET status = 'ready', updated_at = NOW() WHERE id = $1 RETURNING *",
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: "Order marked as ready",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Mark order as done error:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Acceptera order (kurir)
app.patch("/api/orders/:orderId/accept", verifyJWT, verifyRole(["admin", "courier"]), async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      "UPDATE orders SET status = 'assigned', assigned_courier_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [userId, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: "Order accepted",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Accept order error:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Markera order som levererad (kurir)
app.patch("/api/orders/:orderId/delivered", verifyJWT, verifyRole(["admin", "courier"]), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(
      "UPDATE orders SET status = 'delivered', delivered_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: "Order marked as delivered",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Mark order as delivered error:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Hämta order detaljer
app.get("/api/orders/:orderId", verifyJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    
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
               ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN (
        SELECT oio.order_item_id,
               json_agg(
                 json_build_object(
                   'typ', oio.typ,
                   'label', oio.label,
                   'price_delta', oio.price_delta,
                   'custom_note', oio.custom_note
                 )
               ) as options
        FROM order_item_options oio
        GROUP BY oio.order_item_id
      ) opt ON oi.id = opt.order_item_id
      WHERE o.id = $1
      GROUP BY o.id
    `;

    const result = await pool.query(query, [orderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Get order details error:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Hämta användares beställningar
app.get("/api/user/orders", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
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
               ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN (
        SELECT oio.order_item_id,
               json_agg(
                 json_build_object(
                   'typ', oio.typ,
                   'label', oio.label,
                   'price_delta', oio.price_delta,
                   'custom_note', oio.custom_note
                 )
               ) as options
        FROM order_item_options oio
        GROUP BY oio.order_item_id
      ) opt ON oi.id = opt.order_item_id
      WHERE o.customer_email = (SELECT email FROM users WHERE id = $1)
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("User orders error:", error);
    res.status(500).json({ error: "Serverfel" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server with new menu endpoints running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend: http://localhost:5173`);
  console.log(`🍕 New menu endpoints: /api/menu/*`);
  console.log(`🍕 Old menu endpoints: /api/meny/* (for compatibility)`);
});
