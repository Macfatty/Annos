const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const appleSignin = require("apple-signin-auth");
const { body, validationResult } = require("express-validator");
const { db } = require("../orderDB");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateTokens(user) {
  const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

// 📧 E-postinloggning
router.post("/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: "Fel inloggningsuppgifter" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Fel inloggningsuppgifter" });

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 604800000 });
    res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax", maxAge: 15 * 60 * 1000 });
    res.json({});
  });
});

// 🟢 Google OAuth
router.post("/google", async (req, res) => {
  const { token } = req.body;
  const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  const email = payload.email;
  const namn = payload.name;

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ error: "DB-fel" });

    const handleUser = (id) => {
      const { accessToken, refreshToken } = generateTokens({ id, role: "customer" });
      res.cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 604800000 });
      res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax", maxAge: 15 * 60 * 1000 });
      res.json({});
    };

    if (!user) {
      db.run("INSERT INTO users (email, namn, role) VALUES (?, ?, ?)", [email, namn, "customer"], function (err2) {
        if (err2) return res.status(500).json({ error: "Misslyckades skapa användare" });
        handleUser(this.lastID);
      });
    } else {
      handleUser(user.id);
    }
  });
});

// 🍎 Apple-inloggning
router.post("/apple", async (req, res) => {
  const { identityToken } = req.body;
  try {
    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: true
    });

    const email = payload.email || `${payload.sub}@appleid.apple.com`; // ibland maskerad e-post
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
      if (err) return res.status(500).json({ error: "DB-fel" });

      const handleUser = (id) => {
        const { accessToken, refreshToken } = generateTokens({ id, role: "customer" });
        res.cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 604800000 });
        res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax", maxAge: 15 * 60 * 1000 });
        res.json({});
      };

      if (!user) {
        db.run("INSERT INTO users (email, namn, role) VALUES (?, ?, ?)", [email, "AppleUser", "customer"], function (err2) {
          if (err2) return res.status(500).json({ error: "Misslyckades skapa användare" });
          handleUser(this.lastID);
        });
      } else {
        handleUser(user.id);
      }
    });
  } catch (err) {
    res.status(401).json({ error: "Ogiltig Apple-token" });
  }
});

// 🔄 Refresh endpoint
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: "Ingen refresh token" });

  try {
    const payload = jwt.verify(token, process.env.REFRESH_SECRET);
    db.get("SELECT id, role FROM users WHERE id = ?", [payload.userId], (err, user) => {
      if (err || !user) return res.status(401).json({ error: "Ogiltig användare" });
      const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
      res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax", maxAge: 15 * 60 * 1000 });
      res.json({});
    });
  } catch {
    res.status(403).json({ error: "Ogiltig refresh token" });
  }
});

// 🚪 Logout
router.post("/logout", (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "Utloggad" });
});

module.exports = router;
