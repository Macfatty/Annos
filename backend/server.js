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
// NYA MENY-ENDPOINTS (MIGRERADE)
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

// Skapa beställning
app.post("/api/order", verifyJWT, verifyRole(["customer", "admin"]), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { order, restaurant_slug, namn, telefon, adress, email, ovrigt } = req.body;

    // Validera order-data
    if (!order || !Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ 
        error: "Beställning saknas eller är tom",
        code: "INVALID_ORDER"
      });
    }

    // Validera kunduppgifter
    if (!restaurant_slug || !namn || !telefon || !adress || !email) {
      return res.status(400).json({ 
        error: "Kunduppgifter saknas",
        code: "MISSING_CUSTOMER_DATA"
      });
    }

    // Validera email-format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: "Ogiltig e-postadress",
        code: "INVALID_EMAIL"
      });
    }

    // Beräkna total
    const total = order.reduce((sum, rad) => {
      return sum + (rad.total || 0);
    }, 0);
    const totalInOre = Math.round(total * 100); // Konvertera till öre
    const now = new Date().toISOString();

    // Använd transaktion för att säkerställa data-integritet
    await client.query('BEGIN');

    // Skapa huvudorder
    const orderSql = `
      INSERT INTO orders
      (restaurant_slug, customer_name, customer_phone, customer_address, customer_email,
       status, payment_method, payment_status, items_total, delivery_fee, discount_total,
       grand_total, customer_notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `;

    const orderResult = await client.query(
      orderSql,
      [
        restaurant_slug,
        namn,
        telefon,
        adress,
        email,
        'received', // ny status
        'mock', // standard betalningsmetod
        'pending',
        totalInOre,
        0, // delivery_fee
        0, // discount_total
        totalInOre, // grand_total
        ovrigt || '', // customer_notes
        now,
        now
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Spara order items
    for (const orderItem of order) {
      // Validera order item
      if (!orderItem.namn || !orderItem.pris) {
        throw new Error(`Ogiltigt order item: saknar namn eller pris`);
      }

      const itemSql = `
        INSERT INTO order_items (order_id, name, quantity, unit_price, line_total)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const unitPriceInOre = Math.round((orderItem.pris || 0) * 100);
      const lineTotalInOre = Math.round((orderItem.total || orderItem.pris) * 100);

      const itemResult = await client.query(
        itemSql,
        [orderId, orderItem.namn, 1, unitPriceInOre, lineTotalInOre]
      );

      const orderItemId = itemResult.rows[0].id;

      // Spara order item options (tillbehör)
      if (orderItem.tillval && orderItem.tillval.length > 0) {
        for (const tillval of orderItem.tillval) {
          const optionSql = `
            INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
            VALUES ($1, $2, $3, $4, $5)
          `;

          let typ = "övrigt";
          if (tillval.namn.toLowerCase().includes("sås")) typ = "såser";
          else if (tillval.namn.toLowerCase().includes("kött")) typ = "kött";
          else if (tillval.namn.toLowerCase().includes("grön")) typ = "grönt";
          else if (tillval.namn.toLowerCase().includes("dryck")) typ = "drycker";

          await client.query(
            optionSql,
            [
              orderItemId,
              typ,
              tillval.namn,
              Math.round((tillval.pris || 0) * 100),
              tillval.customNote || null
            ]
          );
        }
      }
    }

    // Committa transaktionen
    await client.query('COMMIT');
    
    res.json({
      message: "Beställning mottagen",
      orderId: orderId,
      total: total
    });

  } catch (error) {
    console.error("Fel vid skapande av beställning:", error);
    
    // Rollback transaktionen
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error("Fel vid rollback:", rollbackError);
    }
    
    // Returnera specifika felkoder baserat på feltyp
    if (error.code === '23505') { // Unique constraint violation
      // Kontrollera om det är PRIMARY KEY constraint (sequence problem)
      if (error.constraint === 'orders_pkey') {
        console.error("⚠️  Sequence problem upptäckt:", error.detail);
        return res.status(500).json({ 
          error: "Databasfel - kontakta support",
          code: "SEQUENCE_ERROR",
          hint: "Sequence behöver synkroniseras"
        });
      } else {
        return res.status(409).json({ 
          error: "Beställning med denna information finns redan",
          code: "DUPLICATE_ORDER"
        });
      }
    } else if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        error: "Ogiltig restaurang eller data",
        code: "INVALID_REFERENCE"
      });
    } else if (error.message.includes('Ogiltigt order item')) {
      return res.status(400).json({ 
        error: error.message,
        code: "INVALID_ORDER_ITEM"
      });
    } else {
      return res.status(500).json({ 
        error: "Internt serverfel",
        code: "INTERNAL_ERROR"
      });
    }
  } finally {
    client.release();
  }
});

// Hämta dagens ordrar för restaurang
app.get("/api/admin/orders/today", verifyJWT, verifyRole(["admin", "restaurant"]), (req, res) => {
  const { slug } = req.query;
  
  // Kontrollera att användaren har behörighet för den begärda restaurangen
  if (slug && req.user.restaurant_slug !== slug) {
    return res.status(403).json({ error: "Forbidden: Wrong restaurant slug" });
  }
  
  if (slug) {
    // Hämta ordrar för specifik restaurang
    hamtaDagensOrdrar(slug, (err, orders) => {
      if (err) {
        console.error("Fel vid hämtning av ordrar:", err);
        return res.status(500).json({ error: "Kunde inte hämta ordrar" });
      }
      res.json(orders);
    });
  } else {
    // Hämta alla dagens ordrar (för admin)
    hamtaAllaDagensOrdrar((err, orders) => {
      if (err) {
        console.error("Fel vid hämtning av alla ordrar:", err);
        return res.status(500).json({ error: "Kunde inte hämta ordrar" });
      }
      res.json(orders);
    });
  }
});

// GET /api/admin/orders - Hämta ordrar för restaurang
app.get("/api/admin/orders", verifyJWT, verifyRole(["admin", "restaurant"]), (req, res) => {
  const { slug, status } = req.query;
  
  // Kontrollera att användaren har behörighet för den begärda restaurangen
  if (slug && req.user.role === "restaurant" && req.user.restaurant_slug !== slug) {
    return res.status(403).json({ error: "Forbidden: Wrong restaurant slug" });
  }
  
  if (slug) {
    if (status) {
      // Hämta ordrar för specifik restaurang med status-filter
      hamtaOrdrarMedStatus(slug, status, (err, orders) => {
        if (err) {
          console.error("Fel vid hämtning av ordrar med status:", err);
          return res.status(500).json({ error: "Kunde inte hämta ordrar" });
        }
        res.json(orders);
      });
    } else {
      // Hämta ordrar för specifik restaurang
      hamtaDagensOrdrar(slug, (err, orders) => {
        if (err) {
          console.error("Fel vid hämtning av ordrar:", err);
          return res.status(500).json({ error: "Kunde inte hämta ordrar" });
        }
        res.json(orders);
      });
    }
  } else {
    // Hämta alla ordrar (för admin)
    hamtaAllaDagensOrdrar((err, orders) => {
      if (err) {
        console.error("Fel vid hämtning av alla ordrar:", err);
        return res.status(500).json({ error: "Kunde inte hämta ordrar" });
      }
      res.json(orders);
    });
  }
});

// GET /api/courier/orders - Hämta kurirordrar
app.get("/api/courier/orders", verifyJWT, verifyRole(["courier", "admin"]), (req, res) => {
  const { status } = req.query;
  const courierId = req.user.role === "admin" ? null : req.user.userId;
  
  if (!status) {
    return res.status(400).json({ error: "Status parameter krävs" });
  }
  
  hamtaKurirOrdrar(status, courierId, (err, orders) => {
    if (err) {
      console.error("Fel vid hämtning av kurirordrar:", err);
      return res.status(500).json({ error: "Kunde inte hämta ordrar" });
    }
    res.json(orders);
  });
});

// PATCH /api/courier/orders/:id/accept - Acceptera order
app.patch("/api/courier/orders/:id/accept", verifyJWT, verifyRole(["courier", "admin"]), (req, res) => {
  const { id } = req.params;
  const courierId = req.user.userId;
  
  tilldelaOrderTillKurir(id, courierId, (err) => {
    if (err) {
      console.error("Fel vid orderacceptans:", err);
      return res.status(500).json({ error: "Kunde inte acceptera order" });
    }
    res.json({ 
      message: "Order accepterad", 
      orderId: id, 
      assignedTo: courierId 
    });
  });
});

// PATCH /api/courier/orders/:id/delivered - Markera order som levererad
app.patch("/api/courier/orders/:id/delivered", verifyJWT, verifyRole(["courier", "admin"]), (req, res) => {
  const { id } = req.params;
  
  markeraOrderSomLevererad(id, (err) => {
    if (err) {
      console.error("Fel vid leverans:", err);
      return res.status(500).json({ error: "Kunde inte markera som levererad" });
    }
    res.json({ 
      message: "Order levererad", 
      orderId: id, 
      deliveredAt: new Date().toISOString() 
    });
  });
});

// Markera order som klar
app.put("/api/admin/orders/:id/klart", verifyJWT, verifyRole(["admin", "restaurant"]), (req, res) => {
  const { id } = req.params;
  
  // Kontrollera att ordern tillhör rätt restaurang för restaurant-användare
  if (req.user.role === "restaurant") {
    // Hämta orderns restaurant_slug för validering
    const checkQuery = "SELECT restaurant_slug FROM orders WHERE id = $1";
    pool.query(checkQuery, [id], (err, result) => {
      if (err) {
        console.error("Fel vid hämtning av order-slug:", err);
        return res.status(500).json({ error: "Kunde inte verifiera order" });
      }
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Order inte hittad" });
      }
      
      const orderRestaurantSlug = result.rows[0].restaurant_slug;
      
      if (req.user.restaurant_slug !== orderRestaurantSlug) {
        return res.status(403).json({ error: "Forbidden: Wrong restaurant slug" });
      }
      
      // Fortsätt med markering
      markeraOrderSomKlar(id, (err) => {
        if (err) {
          console.error("Fel vid markering av order som klar:", err);
          return res.status(500).json({ error: "Kunde inte markera order som klar" });
        }
        res.json({ message: "Order markerad som klar" });
      });
    });
  } else {
    // Admin kan markera alla ordrar
    markeraOrderSomKlar(id, (err) => {
      if (err) {
        console.error("Fel vid markering av order som klar:", err);
        return res.status(500).json({ error: "Kunde inte markera order som klar" });
      }
      res.json({ message: "Order markerad som klar" });
    });
  }
});

// Hämta användarprofil
app.get("/api/profile", verifyJWT, async (req, res) => {
  try {
    // BACKWARD COMPATIBILITY: Support both userId (new) and id (old)
    const userId = req.user.userId || req.user.id;

    console.log("[GET /api/profile] req.user:", req.user);
    console.log("[GET /api/profile] userId:", userId);

    const userResult = await pool.query(
      "SELECT id, email, namn, telefon, adress, restaurant_slug FROM users WHERE id = $1",
      [userId]
    );

    console.log("[GET /api/profile] Query result rows:", userResult.rows.length);
    if (userResult.rows.length === 0) {
      console.error("[GET /api/profile] NO USER FOUND with userId:", userId);
      return res.status(404).json({ error: "Användare inte hittad" });
    }

    const user = userResult.rows[0];

    // Hämta användarens beställningar
    const ordersResult = await pool.query(
      "SELECT * FROM orders WHERE customer_email = $1 ORDER BY created_at DESC",
      [user.email]
    );

    // Hämta användarens roll från JWT-token
    const userRole = req.user.role;
    
    res.json({
      ...user,
      role: userRole,
      orders: ordersResult.rows
    });
  } catch (error) {
    console.error("Fel vid hämtning av profil:", error);
    res.status(500).json({ error: "Kunde inte hämta profil" });
  }
});

// Uppdatera användarprofil
app.put("/api/profile", verifyJWT, async (req, res) => {
  try {
    // BACKWARD COMPATIBILITY: Support both userId (new) and id (old)
    const userId = req.user.userId || req.user.id;
    const { namn, telefon, adress } = req.body;

    console.log("[PUT /api/profile] req.user:", req.user);
    console.log("[PUT /api/profile] userId:", userId);
    console.log("[PUT /api/profile] Body:", { namn, telefon, adress });

    // Validera input med specifika felmeddelanden
    const saknadeFalt = [];
    if (!namn || namn.trim() === "") {
      saknadeFalt.push("Namn");
    }
    if (!telefon || telefon.trim() === "") {
      saknadeFalt.push("Telefon");
    }

    if (saknadeFalt.length > 0) {
      return res.status(400).json({
        error: "Obligatoriska fält saknas",
        missingFields: saknadeFalt,
        message: `Följande fält måste fyllas i: ${saknadeFalt.join(", ")}`
      });
    }

    console.log("[PUT /api/profile] Executing UPDATE query with userId:", userId);
    const updateResult = await pool.query(
      "UPDATE users SET namn = $1, telefon = $2, adress = $3 WHERE id = $4 RETURNING id, email, namn, telefon, adress, restaurant_slug",
      [namn.trim(), telefon.trim(), adress?.trim() || "", userId]
    );

    console.log("[PUT /api/profile] Update result rows:", updateResult.rows.length);
    if (updateResult.rows.length === 0) {
      console.error("[PUT /api/profile] NO USER FOUND with userId:", userId);
      return res.status(404).json({ error: "Användare inte hittad" });
    }

    const updatedUser = updateResult.rows[0];

    res.json({
      ...updatedUser,
      role: req.user.role
    });
  } catch (error) {
    console.error("Fel vid uppdatering av profil:", error);
    res.status(500).json({ error: "Kunde inte uppdatera profil" });
  }
});

// Hämta användarens beställningar
app.get("/api/my-orders", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Kontrollera att användaren är kunden eller har admin-behörighet
    const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: "Otillräcklig behörighet" });
    }

    const user = userResult.rows[0];

    const ordersResult = await pool.query(
      "SELECT * FROM orders WHERE customer_email = $1 ORDER BY created_at DESC",
      [user.email]
    );

    res.json(ordersResult.rows);
  } catch (error) {
    console.error("Fel vid hämtning av beställningar:", error);
    res.status(500).json({ error: "Kunde inte hämta beställningar" });
  }
});

// Registrera användare
app.post("/api/register", [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("namn").notEmpty().trim(),
  body("telefon").notEmpty().trim(),
  body("adress").notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, namn, telefon, adress } = req.body;

    // Kontrollera om användaren redan finns
    const existingUserResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Användare med denna e-post finns redan" });
    }

    // Hasha lösenordet
    const hashed = await bcrypt.hash(password, 10);

    // Spara användaren
    const sql = `INSERT INTO users (email, password, namn, telefon, adress) VALUES ($1, $2, $3, $4, $5) RETURNING id`;

    const result = await pool.query(sql, [email, hashed, namn, telefon, adress]);
    
    console.log("✅ Ny användare registrerad:", email);
    res.status(201).json({ message: "Användare skapad framgångsrikt" });
  } catch (error) {
    console.error("❌ Registreringsfel:", error);
    res.status(500).json({ error: "Internt serverfel" });
  }
});

// Logga in användare
app.post("/api/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const sql = `SELECT * FROM users WHERE email = $1`;

    try {
      const result = await pool.query(sql, [email]);
      const user = result.rows[0];
      
      if (!user) {
        return res.status(401).json({ error: "Fel e-post eller lösenord" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Fel e-post eller lösenord" });
      }

      // Skapa JWT-token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role || 'customer' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      // Sätt cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 timmar
      });

      console.log("✅ Användare inloggad:", email);
      res.json({
        message: "Inloggning lyckades",
        user: {
          id: user.id,
          email: user.email,
          namn: user.namn,
          role: user.role || 'customer'
        }
      });
    } catch (err) {
      console.error("Inloggningsfel:", err);
      return res.status(500).json({ error: "Internt serverfel" });
    }
  } catch (error) {
    console.error("Inloggningsfel:", error);
    res.status(500).json({ error: "Internt serverfel" });
  }
});

// Logga ut
app.post("/api/logout", (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Utloggning lyckades" });
});

// Hämta användarens beställningar (alternativ endpoint)
app.get("/api/orders", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Kontrollera att användaren är kunden
    const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: "Otillräcklig behörighet" });
    }

    const user = userResult.rows[0];

    const ordersResult = await pool.query(
      "SELECT * FROM orders WHERE customer_email = $1 ORDER BY created_at DESC",
      [user.email]
    );

    res.json(ordersResult.rows);
  } catch (error) {
    console.error("Fel vid hämtning av beställningar:", error);
    res.status(500).json({ error: "Kunde inte hämta beställningar" });
  }
});

module.exports = app;
module.exports.corsOptions = corsOptions;
