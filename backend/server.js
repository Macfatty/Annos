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

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
  res.send("backend funkar!");
});

// MENY OCH TILLBEHÖR
app.get("/api/meny", (req, res) => {
  const restaurang = req.query.restaurang || "campino";
  const valdMeny = meny[restaurang];
  if (!valdMeny) {
    return res.status(404).json({ message: "Meny ej hittad" });
  }
  res.json(valdMeny);
});

app.get("/api/tillbehor", (req, res) => {
  try {
    res.json(tillbehor);
  } catch (err) {
    console.error("Fel vid laddning av tillbehör:", err);
    res.status(500).json({ fel: "Kunde inte ladda tillbehör" });
  }
});

// SPARA ORDER + KUNDBESTÄLLNING
app.post(
  "/api/order",
  verifyJWT,
  verifyRole(['customer']),
  rateLimit(60000, 10), // 10 beställningar per minut per användare
  [
    body("kund.namn").trim().escape().notEmpty(),
    body("kund.telefon").trim().escape().notEmpty(),
    body("kund.adress").trim().escape().notEmpty(),
    body("kund.ovrigt").optional().trim().escape(),
    body("kund.email").isEmail().normalizeEmail(),
    body("order").isArray({ min: 1 }),
    body("restaurangSlug").trim().escape().notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { kund, order, restaurangSlug } = req.body;
    const { namn, telefon, adress, ovrigt, email } = kund;

    // Validera custom_note i order items
    for (const orderItem of order) {
      if (orderItem.tillval) {
        for (const tillval of orderItem.tillval) {
          if (tillval.custom_note) {
            const note = tillval.custom_note.trim();
            if (note.length === 0) {
              return res.status(400).json({ error: "Tom custom_note" });
            }
            if (note.length > 140) {
              return res.status(400).json({ error: "custom_note för lång (max 140 tecken)" });
            }
            // Validera att den bara innehåller tillåtna tecken
            if (!/^[\p{L}\p{N}\p{P}\p{Zs}]+$/u.test(note)) {
              return res.status(400).json({ error: "custom_note innehåller ogiltiga tecken" });
            }
          }
        }
      }
    }

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
            
            const unitPriceInOre = Math.round(orderItem.pris * 100);
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

                const itemId = this.lastID;

                // Spara tillval som order_item_options
                if (orderItem.tillval && orderItem.tillval.length > 0) {
                  let optionsProcessed = 0;
                  const totalOptions = orderItem.tillval.length;

                  orderItem.tillval.forEach((tillval) => {
                    const optionSql = `
                      INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
                      VALUES (?, ?, ?, ?, ?)
                    `;
                    
                    // Bestäm typ baserat på tillvalets namn eller använd "valfri"
                    let typ = "valfri";
                    if (tillval.namn.toLowerCase().includes("sås")) typ = "såser";
                    else if (tillval.namn.toLowerCase().includes("kött")) typ = "kött";
                    else if (tillval.namn.toLowerCase().includes("grönt")) typ = "grönt";
                    else if (tillval.namn.toLowerCase().includes("dryck")) typ = "drycker";

                    db.run(
                      optionSql,
                      [
                        itemId,
                        typ,
                        tillval.namn,
                        Math.round((tillval.pris || 0) * 100), // price_delta i öre
                        tillval.custom_note || null
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

                              if (process.env.NODE_ENV === "development") {
                                console.log("Order ID:", orderId);
                                console.log("Kundinfo:", kund);
                                console.log("Orderinnehåll:", order);
                                console.log("Tid:", new Date().toLocaleString("sv-SE"));
                              }

                              res.status(201).json({ message: "Beställning mottagen", orderId });
                            });
                          }
                        }
                      }
                    );
                  });
                } else {
                  // Inga tillval, fortsätt till nästa item
                  itemsProcessed++;
                  if (itemsProcessed === totalItems) {
                    // Alla items sparade, committa transaktionen
                    db.run("COMMIT", (err) => {
                      if (err) {
                        console.error("Kunde inte committa transaktion:", err.message);
                        return res.status(500).json({ message: "Internt serverfel" });
                      }

                      res.status(201).json({ message: "Beställning mottagen", orderId });
                    });
                  }
                }
              }
            );
          });
        }
      );
    });
  }
);

// ADMIN – HÄMTA ORDRAR
app.get("/api/admin/orders/today", verifyAdminForSlug, (req, res) => {
  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ message: "Slug saknas" });
  }
  hamtaDagensOrdrar(slug, (err, ordrar) => {
    if (err) {
      console.error("Fel vid hämtning av dagens ordrar:", err);
      return res.status(500).json({ message: "Serverfel" });
    }
    res.json(ordrar);
  });
});

app.get("/api/admin/orders/latest", verifyAdminForSlug, (req, res) => {
  hamtaSenasteOrder((err, order) => {
    if (err) {
      console.error("Fel vid hämtning av senaste order:", err);
      return res.status(500).json({ message: "Serverfel" });
    }
    res.json(order);
  });
});

app.patch("/api/admin/orders/:id/klart", verifyAdminForSlug, (req, res) => {
  const orderId = req.params.id;
  markeraOrderSomKlar(orderId, (err) => {
    if (err) {
      console.error("❌ Fel vid markering:", err);
      return res
        .status(500)
        .json({ message: "Kunde inte markera order som klar" });
    }
    res.json({ message: "Order markerad som klar" });
  });
});

// NYA API ENDPOINTS MED STATUSMASKIN

// KUND - Hämta orderstatus för polling
app.get("/api/order/:id", verifyToken, (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.userId;

  // Kontrollera att användaren har tillgång till ordern
  hamtaOrderMedDetaljer(orderId, (err, order) => {
    if (err) {
      console.error("Fel vid hämtning av order:", err);
      return res.status(500).json({ error: "Serverfel" });
    }

    if (!order) {
      return res.status(404).json({ error: "Order hittades inte" });
    }

    // Kontrollera att användaren är kunden eller har admin-behörighet
    db.get("SELECT email FROM users WHERE id = ?", [userId], (err, user) => {
      if (err || !user) {
        return res.status(403).json({ error: "Otillräcklig behörighet" });
      }

      if (req.user.role !== 'admin' && user.email !== order.customer_email) {
        return res.status(403).json({ error: "Otillräcklig behörighet" });
      }

      const statusMessages = {
        'received': 'Order mottagen',
        'accepted': 'Order accepterad och tillverkas',
        'in_progress': 'Din mat tillverkas nu',
        'out_for_delivery': 'Din mat är på väg',
        'delivered': 'Order levererad'
      };

      res.json({
        id: order.id,
        status: order.status,
        statusMessage: statusMessages[order.status] || 'Okänd status',
        updated_at: order.updated_at
      });
    });
  });
});

// RESTAURANG - Hämta ordrar med statusfilter
app.get("/api/admin/orders", verifyRole(['restaurant', 'admin']), (req, res) => {
  const { slug, status } = req.query;
  const user = req.user;

  // Verifiera behörighet för restaurant-roll
  if (user.role === 'restaurant' && user.restaurangSlug !== slug) {
    return res.status(403).json({ error: "Otillräcklig behörighet" });
  }

  if (!slug) {
    return res.status(400).json({ error: "Slug saknas" });
  }

  const callback = (err, orders) => {
    if (err) {
      console.error("Fel vid hämtning av ordrar:", err);
      return res.status(500).json({ error: "Serverfel" });
    }

    // Maskera telefonnummer för säkerhet
    const safeOrders = orders.map(order => ({
      ...order,
      customer_phone: order.customer_phone.replace(/(\d{3})\d{4}(\d{2})/, '$1***$2')
    }));

    res.json(safeOrders);
  };

  if (status) {
    hamtaOrdrarMedStatus(slug, status, callback);
  } else {
    hamtaDagensOrdrar(slug, callback);
  }
});

// RESTAURANG - Uppdatera orderstatus
app.patch("/api/admin/orders/:id/status", verifyRole(['restaurant', 'admin']), (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;
  const user = req.user;

  hamtaOrderMedDetaljer(id, (err, order) => {
    if (err) {
      console.error("Fel vid hämtning av order:", err);
      return res.status(500).json({ error: "Serverfel" });
    }

    if (!order) {
      return res.status(404).json({ error: "Order hittades inte" });
    }

    // Verifiera behörighet
    if (user.role === 'restaurant' && user.restaurangSlug !== order.restaurant_slug) {
      return res.status(403).json({ error: "Otillräcklig behörighet" });
    }

    // Validera statusövergång
    if (!isValidStatusTransition(order.status, newStatus)) {
      return res.status(409).json({
        error: "Ogiltig statusövergång",
        currentStatus: order.status,
        requestedStatus: newStatus,
        allowedTransitions: ['received'].includes(order.status) ? ['accepted'] : 
                          ['accepted'].includes(order.status) ? ['in_progress'] :
                          ['in_progress'].includes(order.status) ? ['out_for_delivery'] : []
      });
    }

    // Uppdatera status
    uppdateraOrderStatus(id, newStatus, (err) => {
      if (err) {
        console.error("Fel vid statusuppdatering:", err);
        return res.status(500).json({ error: "Serverfel" });
      }

      res.json({
        message: "Status uppdaterad",
        newStatus,
        orderId: id
      });
    });
  });
});

// KURIR - Hämta ordrar
app.get("/api/courier/orders", verifyRole(['courier', 'admin']), (req, res) => {
  const { status } = req.query;
  const courierId = req.user.userId;

  hamtaKurirOrdrar(status || 'pending', courierId, (err, orders) => {
    if (err) {
      console.error("Fel vid hämtning av kurirordrar:", err);
      return res.status(500).json({ error: "Serverfel" });
    }

    // Filtrera bort PII för kurirer (behåll endast namn, adress, telefon)
    const safeOrders = orders.map(order => ({
      id: order.id,
      customer_name: order.customer_name,
      customer_address: order.customer_address,
      customer_phone: order.customer_phone,
      grand_total: order.grand_total,
      restaurant_slug: order.restaurant_slug,
      status: order.status,
      created_at: order.created_at
      // Medvetet exkluderat: email, orderdetaljer, betalningsinfo
    }));

    res.json(safeOrders);
  });
});

// KURIR - Acceptera order
app.patch("/api/courier/orders/:id/accept", verifyRole(['courier', 'admin']), (req, res) => {
  const { id } = req.params;
  const courierId = req.user.userId;

  tilldelaOrderTillKurir(id, courierId, (err) => {
    if (err) {
      console.error("Fel vid orderacceptans:", err);
      return res.status(409).json({ error: err.message });
    }

    res.json({
      message: "Order accepterad",
      orderId: id,
      assignedTo: courierId
    });
  });
});

// KURIR - Markera som levererad
app.patch("/api/courier/orders/:id/delivered", verifyRole(['courier', 'admin']), (req, res) => {
  const { id } = req.params;
  const courierId = req.user.userId;

  // Kontrollera att kuriren är tilldelad till ordern
  hamtaOrderMedDetaljer(id, (err, order) => {
    if (err) {
      console.error("Fel vid hämtning av order:", err);
      return res.status(500).json({ error: "Serverfel" });
    }

    if (!order) {
      return res.status(404).json({ error: "Order hittades inte" });
    }

    if (order.assigned_courier_id !== courierId) {
      return res.status(403).json({ error: "Du är inte tilldelad denna order" });
    }

    if (order.status !== 'out_for_delivery') {
      return res.status(409).json({ error: "Order är inte ute för leverans" });
    }

    markeraOrderSomLevererad(id, (err) => {
      if (err) {
        console.error("Fel vid leverans:", err);
        return res.status(500).json({ error: "Serverfel" });
      }

      res.json({
        message: "Order levererad",
        orderId: id,
        deliveredAt: Date.now()
      });
    });
  });
});

// BETALNING ENDPOINTS

// Skapa betalning
app.post("/api/payments/create", verifyToken, rateLimit(60000, 5), (req, res) => {
  try {
    validatePaymentRequest(req.body);
    const { method, orderId } = req.body;
    const userId = req.user.userId;

    // Hämta order och verifiera att användaren har tillgång
    hamtaOrderMedDetaljer(orderId, (err, order) => {
      if (err) {
        console.error("Fel vid hämtning av order:", err);
        return res.status(500).json({ error: "Serverfel" });
      }

      if (!order) {
        return res.status(404).json({ error: "Order hittades inte" });
      }

      // Kontrollera att användaren är kunden
      db.get("SELECT email FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
          return res.status(403).json({ error: "Otillräcklig behörighet" });
        }

        if (req.user.role !== 'admin' && user.email !== order.customer_email) {
          return res.status(403).json({ error: "Otillräcklig behörighet" });
        }

        // Skapa betalning
        const provider = createPaymentProvider(method);
        
        provider.createPayment(order)
          .then(payment => {
            logPaymentActivity('Skapad', payment.paymentId, orderId, method);
            
            res.json({
              paymentId: payment.paymentId,
              status: payment.status,
              qrCode: payment.qrCode,
              instructions: method === 'swish' ? 'Öppna Swish och skanna QR-koden' : 'Följ instruktionerna',
              amount: payment.amount,
              expiresAt: payment.expiresAt
            });
          })
          .catch(error => {
            console.error('Betalningsfel:', error);
            res.status(500).json({ error: 'Kunde inte skapa betalning' });
          });
      });
    });

  } catch (error) {
    console.error('Valideringsfel:', error);
    res.status(400).json({ error: error.message });
  }
});

// Kontrollera betalningsstatus
app.get("/api/payments/:paymentId/status", verifyToken, (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.userId;

  // Hitta betalningsmetoden från paymentId
  const method = paymentId.startsWith('mock_swish') ? 'swish' : 
                paymentId.startsWith('swish_') ? 'swish' :
                paymentId.startsWith('klarna_') ? 'klarna' : 'card';

  const provider = createPaymentProvider(method);
  
  provider.verifyPayment(paymentId)
    .then(status => {
      logPaymentActivity('Status kontrollerad', paymentId, 'unknown', method);
      res.json(status);
    })
    .catch(error => {
      console.error('Statuskontrollfel:', error);
      res.status(500).json({ error: 'Kunde inte kontrollera betalningsstatus' });
    });
});

// REGISTRERING
app.post(
  "/api/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("losenord").isStrongPassword(),
    body("namn").trim().escape().notEmpty(),
    body("telefon").optional().trim().escape(),
    body("adress").optional().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, losenord, namn, telefon, adress } = req.body;

    const hashed = await bcrypt.hash(losenord, 10);
    const sql = `INSERT INTO users (email, password, namn, telefon, adress) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [email, hashed, namn, telefon, adress], function (err) {
      if (err) {
        console.error("❌ Registreringsfel:", err.message);
        return res.status(400).json({ error: "E-post finns redan" });
      }
      res.status(201).json({ message: "Användare skapad" });
    });
  }
);

// LOGIN
app.post(
  "/api/login",
  rateLimit(60000, 5), // 5 försök per minut
  [body("email").isEmail().normalizeEmail(), body("losenord").notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, losenord } = req.body;
    const sql = `SELECT * FROM users WHERE email = ?`;

    db.get(sql, [email], async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: "Fel e-post eller lösenord" });
      }

      const match = await bcrypt.compare(losenord, user.password);
      if (!match) {
        return res.status(401).json({ error: "Fel e-post eller lösenord" });
      }

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        namn: user.namn,
        email: user.email,
        telefon: user.telefon,
        adress: user.adress || "",
        role: user.role,
        restaurangSlug: user.restaurangSlug || "",
      });
    });
  }
);

// PROFIL – SIMPEL ENDPOINT
app.get("/api/profile", verifyJWT, (req, res) => {
  const { id, role, name, email } = req.user;
  res.json({ id, role, name, email });
});

// PROFIL MED BESTÄLLNINGSHISTORIK – SEPARAT ENDPOINT
app.get("/api/profile-details", verifyToken, (req, res) => {
  const userId = req.user.userId;

  db.get(
    "SELECT id, email, namn, telefon, adress, restaurangSlug FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: "Användare finns inte" });
      }

      const sql = `SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC`;
      db.all(sql, [user.email], (err, orders) => {
        if (err) {
          console.error("Fel vid hämtning av beställningar:", err);
          return res
            .status(500)
            .json({ error: "Kunde inte hämta beställningar" });
        }

        res.json({
          namn: user.namn,
          email: user.email,
          telefon: user.telefon,
          adress: user.adress,
          restaurangSlug: user.restaurangSlug || "",
          bestallningar: orders || [],
        });
      });
    }
  );
});

// MINA BESTÄLLNINGAR
app.get("/api/my-orders", verifyToken, (req, res) => {
  const userId = req.user.userId;
  const userSql = `SELECT email FROM users WHERE id = ?`;

  db.get(userSql, [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: "Användare saknas" });
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

if (require.main === module) {
  // Kör migration först
  ensureAssignedCourierId()
    .then(() => {
      // Kontrollera admin-användare
      db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1", (err, row) => {
        if (err) {
          console.error('Fel vid kontroll av admin-anv\xE4ndare:', err.message);
        } else if (!row) {
          console.warn(
            '⚠️ Inget admin-konto hittades. Kör "node backend/skapaAdmin.js" innan du loggar in på /admin.'
          );
        }

        // Starta server
        app.listen(PORT, () => {
          console.log(`Servern körs på http://localhost:${PORT}`);
        });
      });
    })
    .catch((error) => {
      console.error('Migration misslyckades:', error);
      process.exit(1);
    });
}

module.exports = app;
module.exports.corsOptions = corsOptions;
