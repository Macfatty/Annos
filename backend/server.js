const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyToken, verifyRole } = require("./authMiddleware");
const { body, validationResult } = require("express-validator");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const meny = require("./Data/menuData.js");
const tillbehor = require("./Data/tillbehorData.js");
const {
  hamtaDagensOrdrar,
  hamtaSenasteOrder,
  markeraOrderSomKlar,
  db,
} = require("./orderDB");


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("backend funkar!");
});

// MENY OCH TILLBEHÖR
app.get("/api/meny", (req, res) => {
  res.json(meny);
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
  verifyToken,
  [
    body("kund.namn").trim().escape().notEmpty(),
    body("kund.telefon").trim().escape().notEmpty(),
    body("kund.adress").trim().escape().notEmpty(),
    body("kund.ovrigt").optional().trim().escape(),
    body("kund.email").isEmail().normalizeEmail(),
    body("order").isArray({ min: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { kund, order } = req.body;
    const { namn, telefon, adress, ovrigt, email } = kund;

  const order_json = JSON.stringify(order);
  const total = order.reduce((sum, rad) => {
    return sum + (rad.total || 0);
  }, 0);
  const status = "aktiv";

  const sql = `
    INSERT INTO orders 
    (namn, telefon, adress, extraInfo, order_json, status, total, email, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;

  db.run(
    sql,
    [namn, telefon, adress, ovrigt, order_json, status, total, email],
    function (err) {
      if (err) {
        console.error("Kunde inte spara order:", err.message);
        return res.status(500).json({ message: "Internt serverfel" });
      }

      console.log("Ny beställning sparad");

      if (process.env.NODE_ENV === "development") {
        console.log("Order ID:", this.lastID);
        console.log("Kundinfo:", kund);
        console.log("Orderinnehåll:", order);
        console.log("Tid:", new Date().toLocaleString("sv-SE"));
      }

      res.status(201).json({ message: "Beställning mottagen", orderId: this.lastID });
    }
  );
});

// ADMIN – HÄMTA ORDRAR
app.get("/api/admin/orders/today", verifyRole("admin"), (req, res) => {
  hamtaDagensOrdrar((err, ordrar) => {
    if (err) {
      console.error("Fel vid hämtning av dagens ordrar:", err);
      return res.status(500).json({ message: "Serverfel" });
    }
    res.json(ordrar);
  });
});

app.get("/api/admin/orders/latest", verifyRole("admin"), (req, res) => {
  hamtaSenasteOrder((err, order) => {
    if (err) {
      console.error("Fel vid hämtning av senaste order:", err);
      return res.status(500).json({ message: "Serverfel" });
    }
    res.json(order);
  });
});

app.patch("/api/admin/orders/:id/klart", verifyRole("admin"), (req, res) => {
  const orderId = req.params.id;
  markeraOrderSomKlar(orderId, (err) => {
    if (err) {
      console.error("❌ Fel vid markering:", err);
      return res.status(500).json({ message: "Kunde inte markera order som klar" });
    }
    res.json({ message: "Order markerad som klar" });
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
  [
    body("email").isEmail().normalizeEmail(),
    body("losenord").notEmpty(),
  ],
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

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      namn: user.namn,
      email: user.email,
      telefon: user.telefon,
      adress: user.adress || "",
      role: user.role,
    });
  });
});

// PROFIL – INKL. BESTÄLLNINGSHISTORIK
app.get("/api/profile", verifyToken, (req, res) => {
  const userId = req.user.userId;

  db.get(
    "SELECT id, email, namn, telefon, adress FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: "Användare finns inte" });
      }

      const sql = `SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC`;
      db.all(sql, [user.email], (err, orders) => {
        if (err) {
          console.error("Fel vid hämtning av beställningar:", err);
          return res.status(500).json({ error: "Kunde inte hämta beställningar" });
        }

        res.json({
          namn: user.namn,
          email: user.email,
          telefon: user.telefon,
          adress: user.adress,
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

    const orderSql = `SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC`;
    db.all(orderSql, [user.email], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Kunde inte hämta beställningar" });
      }

      res.json(rows);
    });
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servern körs på http://localhost:${PORT}`);
  });
}

module.exports = app;
