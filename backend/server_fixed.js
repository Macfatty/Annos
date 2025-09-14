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
app.post("/api/order", verifyRole(["customer", "admin"]), async (req, res) => {
  try {
    const { order, restaurangSlug, namn, telefon, adress, email } = req.body;

    if (!order || !Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: "Beställning saknas eller är tom" });
    }

    if (!restaurangSlug || !namn || !telefon || !adress || !email) {
      return res.status(400).json({ message: "Kunduppgifter saknas" });
    }

    // Beräkna total
    const total = order.reduce((sum, rad) => {
      return sum + (rad.total || 0);
    }, 0);
    const totalInOre = Math.round(total * 100); // Konvertera till öre
    const now = Date.now();

    // Använd transaktion för att säkerställa data-integritet
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Skapa huvudorder
      const orderSql = `
        INSERT INTO orders
        (restaurant_slug, customer_name, customer_phone, customer_address, customer_email,
         status, payment_method, payment_status, items_total, delivery_fee, discount_total,
         grand_total, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        orderSql,
        [
          restaurangSlug,
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
          now,
          now
        ],
        function (err) {
          if (err) {
            console.error("Kunde inte spara order:", err.message);
            db.run("ROLLBACK");
            return res.status(500).json({ message: "Internt serverfel" });
          }

          const orderId = this.lastID;
          console.log("Ny beställning sparad med ID:", orderId);

          // Spara order items
          let itemsProcessed = 0;
          const totalItems = order.length;

          order.forEach((orderItem) => {
            const itemSql = `
              INSERT INTO order_items (order_id, name, quantity, unit_price, line_total)
              VALUES (?, ?, ?, ?, ?)
            `;

            const unitPriceInOre = Math.round((orderItem.pris || 0) * 100);
            const lineTotalInOre = Math.round((orderItem.total || orderItem.pris) * 100);

            db.run(
              itemSql,
              [orderId, orderItem.namn, 1, unitPriceInOre, lineTotalInOre],
              function (err) {
                if (err) {
                  console.error("Kunde inte spara order item:", err.message);
                  db.run("ROLLBACK");
                  return res.status(500).json({ message: "Internt serverfel" });
                }

                const orderItemId = this.lastID;

                // Spara order item options (tillbehör)
                if (orderItem.tillval && orderItem.tillval.length > 0) {
                  let optionsProcessed = 0;
                  const totalOptions = orderItem.tillval.length;

                  orderItem.tillval.forEach((tillval) => {
                    const optionSql = `
                      INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
                      VALUES (?, ?, ?, ?, ?)
                    `;

                    let typ = "övrigt";
                    if (tillval.namn.toLowerCase().includes("sås")) typ = "såser";
                    else if (tillval.namn.toLowerCase().includes("kött")) typ = "kött";
                    else if (tillval.namn.toLowerCase().includes("grön")) typ = "grönt";
                    else if (tillval.namn.toLowerCase().includes("dryck")) typ = "drycker";

                    db.run(
                      optionSql,
                      [
                        orderItemId,
                        typ,
                        tillval.namn,
                        Math.round((tillval.pris || 0) * 100),
                        tillval.customNote || null
                      ],
                      function (err) {
                        if (err) {
                          console.error("Kunde inte spara order item option:", err.message);
                          db.run("ROLLBACK");
                          return res.status(500).json({ message: "Internt serverfel" });
                        }

                        optionsProcessed++;
                        if (optionsProcessed === totalOptions) {
                          itemsProcessed++;
                          if (itemsProcessed === totalItems) {
                            // Alla items och options sparade, committa transaktionen
                            db.run("COMMIT", (err) => {
                              if (err) {
                                console.error("Kunde inte committa transaktion:", err.message);
                                return res.status(500).json({ message: "Internt serverfel" });
                              }

                              console.log("Beställning sparad framgångsrikt");
                              res.json({
                                message: "Beställning mottagen",
                                orderId: orderId,
                                total: total
                              });
                            });
                          }
                        }
                      }
                    );
                  });
                } else {
                  // Inga tillbehör, bara committa item
                  itemsProcessed++;
                  if (itemsProcessed === totalItems) {
                    // Alla items sparade, committa transaktionen
                    db.run("COMMIT", (err) => {
                      if (err) {
                        console.error("Kunde inte committa transaktion:", err.message);
                        return res.status(500).json({ message: "Internt serverfel" });
                      }

                      console.log("Beställning sparad framgångsrikt");
                      res.json({
                        message: "Beställning mottagen",
                        orderId: orderId,
                        total: total
                      });
                    });
                  }
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    console.error("Fel vid skapande av beställning:", error);
    res.status(500).json({ message: "Internt serverfel" });
  }
});

// Hämta dagens ordrar för restaurang
app.get("/api/admin/orders/today", verifyRole(["admin", "restaurant"]), (req, res) => {
  const { slug } = req.query;
  
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

// Markera order som klar
app.put("/api/admin/orders/:id/klart", verifyRole(["admin", "restaurant"]), (req, res) => {
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
app.get("/api/profile", verifyJWT, (req, res) => {
  const userId = req.user.userId;

  db.get(
    "SELECT id, email, namn, telefon, adress, restaurangSlug FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        console.error("Fel vid hämtning av profil:", err);
        return res.status(500).json({ error: "Kunde inte hämta profil" });
      }

      if (!user) {
        return res.status(404).json({ error: "Användare inte hittad" });
      }

      // Hämta användarens beställningar
      const sql = `SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC`;
      db.all(sql, [user.email], (err, orders) => {
        if (err) {
          console.error("Fel vid hämtning av beställningar:", err);
          return res.status(500).json({ error: "Kunde inte hämta beställningar" });
        }

        res.json({
          ...user,
          orders: orders
        });
      });
    }
  );
});

// Hämta användarens beställningar
app.get("/api/my-orders", verifyJWT, (req, res) => {
  const userId = req.user.userId;

  // Kontrollera att användaren är kunden eller har admin-behörighet
  db.get("SELECT email FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) {
      return res.status(403).json({ error: "Otillräcklig behörighet" });
    }

    const sql = `SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC`;
    db.all(sql, [user.email], (err, rows) => {
      if (err) {
        console.error("Fel vid hämtning av beställningar:", err);
        return res.status(500).json({ error: "Kunde inte hämta beställningar" });
      }

      res.json(rows);
    });
  });
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
    const existingUser = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: "Användare med denna e-post finns redan" });
    }

    // Hasha lösenordet
    const hashed = await bcrypt.hash(password, 10);

    // Spara användaren
    const sql = `INSERT INTO users (email, password, namn, telefon, adress) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [email, hashed, namn, telefon, adress], function (err) {
      if (err) {
        console.error("❌ Registreringsfel:", err.message);
        return res.status(500).json({ error: "Kunde inte skapa användare" });
      }

      console.log("✅ Ny användare registrerad:", email);
      res.status(201).json({ message: "Användare skapad framgångsrikt" });
    });
  } catch (error) {
    console.error("Registreringsfel:", error);
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

    const sql = `SELECT * FROM users WHERE email = ?`;

    db.get(sql, [email], async (err, user) => {
      if (err || !user) {
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
    });
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
app.get("/api/orders", verifyJWT, (req, res) => {
  const userId = req.user.userId;

  // Kontrollera att användaren är kunden
  db.get("SELECT email FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) {
      return res.status(403).json({ error: "Otillräcklig behörighet" });
    }

    const orderSql = `SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC`;
    db.all(orderSql, [user.email], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Kunde inte hämta beställningar" });
      }

      res.json(rows);
    });
  });
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
