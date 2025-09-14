const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const appleSignin = require("apple-signin-auth");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const dotenv = require("dotenv");
dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateTokens(user) {
  if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
    throw new Error(
      " Miljövariabler saknas: Se till att JWT_SECRET och REFRESH_SECRET är definierade i .env"
    );
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

  return { accessToken, refreshToken };
}

// 📧 E-postinloggning
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("losenord").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { email, losenord } = req.body;

      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0)
        return res.status(401).json({ error: "Fel inloggningsuppgifter" });

      const user = userResult.rows[0];
      const match = await bcrypt.compare(losenord, user.password);
      if (!match)
        return res.status(401).json({ error: "Fel inloggningsuppgifter" });

      const { accessToken, refreshToken } = generateTokens(user);
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 604800000,
      });
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
      res.json({
        namn: user.namn,
        email: user.email,
        telefon: user.telefon,
        adress: user.adress || "",
        role: user.role,
        restaurant_slug: user.restaurant_slug || "",
      });
    } catch (error) {
      console.error("Inloggningsfel:", error);
      res.status(500).json({ error: "Internt serverfel" });
    }
  }
);

// 🟢 Google OAuth
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const namn = payload.name;

    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    const handleUser = (id) => {
      const { accessToken, refreshToken } = generateTokens({
        id,
        role: "customer",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 604800000,
      });
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
      res.json({});
    };

    if (userResult.rows.length === 0) {
      const insertResult = await pool.query(
        "INSERT INTO users (email, namn, role) VALUES ($1, $2, $3) RETURNING id",
        [email, namn, "customer"]
      );
      handleUser(insertResult.rows[0].id);
    } else {
      handleUser(userResult.rows[0].id);
    }
  } catch (error) {
    console.error("Google OAuth fel:", error);
    res.status(500).json({ error: "DB-fel" });
  }
});

// 🍎 Apple-inloggning
router.post("/apple", async (req, res) => {
  try {
    const { identityToken } = req.body;
    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: true,
    });

    const email = payload.email || `${payload.sub}@appleid.apple.com`; // ibland maskerad e-post
    
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    const handleUser = (id) => {
      const { accessToken, refreshToken } = generateTokens({
        id,
        role: "customer",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 604800000,
      });
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
      res.json({});
    };

    if (userResult.rows.length === 0) {
      const insertResult = await pool.query(
        "INSERT INTO users (email, namn, role) VALUES ($1, $2, $3) RETURNING id",
        [email, "AppleUser", "customer"]
      );
      handleUser(insertResult.rows[0].id);
    } else {
      handleUser(userResult.rows[0].id);
    }
  } catch (err) {
    console.error("Apple OAuth fel:", err);
    res.status(401).json({ error: "Ogiltig Apple-token" });
  }
});

// 🔄 Refresh endpoint
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: "Ingen refresh token" });

    const payload = jwt.verify(token, process.env.REFRESH_SECRET);
    
    const userResult = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [payload.userId]
    );
    
    if (userResult.rows.length === 0)
      return res.status(401).json({ error: "Ogiltig användare" });
    
    const user = userResult.rows[0];
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.json({});
  } catch (error) {
    console.error("Refresh token fel:", error);
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
