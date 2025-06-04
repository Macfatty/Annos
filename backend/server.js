const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;
const meny = require("./Data/menuData.js");
const {
  hamtaDagensOrdrar,
  hamtaSenasteOrder,
  markeraOrderSomKlar,
  db,
} = require("./orderDB");

const SECRET = "hemligKod123"; // byt till process.env.JWT_SECRET i produktion

app.use(cors());
app.use(express.json());

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Ingen token" });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Ogiltig token" });
  }
}

app.get("/", (req, res) => {
  res.send("backend funkar!");
});

// MENY OCH TILLBEHÖR
app.get("/api/meny", (req, res) => {
  res.json(meny);
});

app.get("/api/tillbehor", (req, res) => {
  try {
    const base = path.join(__dirname, "Data", "Tillbehör");

    const kött = JSON.parse(fs.readFileSync(path.join(base, "Kött.json")));
    const grönt = JSON.parse(fs.readFileSync(path.join(base, "grönt.json")));
    const såser = JSON.parse(fs.readFileSync(path.join(base, "såser.json")));
    const drycker = JSON.parse(fs.readFileSync(path.join(base, "drycker.json")));
    const övrigt = JSON.parse(fs.readFileSync(path.join(base, "övrigt.json")));

    const alla = [...kött, ...grönt, ...såser, ...drycker, ...övrigt];
    res.json(alla);
  } catch (err) {
    console.error("Fel vid laddning av tillbehör:", err);
    res.status(500).json({ fel: "Kunde inte ladda tillbehör" });
  }
});

// SPARA ORDER + KUNDBESTÄLLNING
app.post("/api/order", authenticateToken, (req, res) => {
  const { kund, order } = req.body;

  if (!kund || !order || !Array.isArray(order)) {
    return res.status(400).json({ message: "Saknar kund eller orderdata" });
  }

  const { namn, telefon, adress, ovrigt, email } = kund;

  if (!namn || !telefon || !adress || !email) {
    return res.status(400).json({ message: "Ofullständig kundinformation" });
  }

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

      console.log("📦 Beställning mottagen och sparad:");
      console.log("🔢 Order ID:", this.lastID);
      console.log("👤 Kundinfo:", kund);
      console.log("🧾 Orderinnehåll:", order);
      console.log("🕒 Tid:", new Date().toLocaleString("sv-SE"));

      res.status(201).json({ message: "Beställning mottagen", orderId: this.lastID });
    }
  );
});

// ADMIN – HÄMTA ORDRAR
app.get("/api/admin/orders/today", authenticateToken, (req, res) => {
  hamtaDagensOrdrar((err, ordrar) => {
    if (err) {
      console.error("Fel vid hämtning av dagens ordrar:", err);
      return res.status(500).json({ message: "Serverfel" });
    }
    res.json(ordrar);
  });
});

app.get("/api/admin/orders/latest", authenticateToken, (req, res) => {
  hamtaSenasteOrder((err, order) => {
    if (err) {
      console.error("Fel vid hämtning av senaste order:", err);
      return res.status(500).json({ message: "Serverfel" });
    }
    res.json(order);
  });
});

app.post("/api/admin/orders/:id/klart", authenticateToken, (req, res) => {
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
app.post("/api/register", async (req, res) => {
  const { email, losenord, namn, telefon, adress } = req.body;

  if (!email || !losenord || !namn) {
    return res.status(400).json({ error: "Saknar fält" });
  }

  const hashed = await bcrypt.hash(losenord, 10);
  const sql = `INSERT INTO users (email, password, namn, telefon, adress) VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [email, hashed, namn, telefon, adress], function (err) {
    if (err) {
      console.error("❌ Registreringsfel:", err.message);
      return res.status(400).json({ error: "E-post finns redan" });
    }
    res.status(201).json({ message: "Användare skapad" });
  });
});

// LOGIN
app.post("/api/login", (req, res) => {
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

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" });

    res.json({
      token,
      namn: user.namn,
      email: user.email,
      telefon: user.telefon,
      adress: user.adress || "",
    });
  });
});

// PROFIL – INKL. BESTÄLLNINGSHISTORIK
app.get("/api/profile", authenticateToken, (req, res) => {
  const payload = req.user;
  db.get(
      "SELECT id, email, namn, telefon, adress FROM users WHERE id = ?",
      [payload.userId],
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
app.get("/api/my-orders", authenticateToken, (req, res) => {
  const payload = req.user;
  const userSql = `SELECT email FROM users WHERE id = ?`;

  db.get(userSql, [payload.userId], (err, user) => {
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

app.listen(PORT, () => {
  console.log(`Servern körs på http://localhost:${PORT}`);
});
