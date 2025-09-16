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

// Skapa beställning
app.post("/api/order", verifyJWT, verifyRole(["customer", "admin"]), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { order, restaurant_slug, namn, telefon, adress, email, ovrigt } = req.body;

    if (!order || !Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: "Beställning saknas eller är tom" });
    }

    if (!restaurant_slug || !namn || !telefon || !adress || !email) {
      return res.status(400).json({ message: "Kunduppgifter saknas" });
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
    console.log("Ny beställning sparad med ID:", orderId);

    // Spara order items
    for (const orderItem of order) {
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

    console.log("Beställning sparad framgångsrikt");
    res.json({
      message: "Beställning mottagen",
      orderId: orderId,
      total: total
    });

  } catch (error) {
    console.error("Fel vid skapande av beställning:", error);
    await client.query('ROLLBACK');
    res.status(500).json({ message: "Internt serverfel" });
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
  
  markeraOrderSomKlar(id, (err) => {
    if (err) {
      console.error("Fel vid markering av order som klar:", err);
      return res.status(500).json({ error: "Kunde inte markera order som klar" });
    }
    res.json({ message: "Order markerad som klar" });
  });
});

// Hämta användarprofil
app.get("/api/profile", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query(
      "SELECT id, email, namn, telefon, adress, restaurant_slug FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
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
    const userId = req.user.userId;
    const { namn, telefon, adress } = req.body;

    // Validera input
    if (!namn || !telefon) {
      return res.status(400).json({ error: "Namn och telefon krävs" });
    }

    const updateResult = await pool.query(
      "UPDATE users SET namn = $1, telefon = $2, adress = $3 WHERE id = $4 RETURNING id, email, namn, telefon, adress, restaurant_slug",
      [namn, telefon, adress || "", userId]
    );

    if (updateResult.rows.length === 0) {
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

// Starta servern
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servern körs på http://localhost:${PORT}`);
    console.log(`Frontend: ${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}`);
    console.log(`Admin Panel: ${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/admin`);
  });
}

module.exports = app;
module.exports.corsOptions = corsOptions;
