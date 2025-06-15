const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Ingen token" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Ogiltig token" });
  }
}

function verifyRole(requiredRole) {
  return (req, res, next) => {
    verifyToken(req, res, () => {
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ error: "Otillräcklig behörighet" });
      }
      next();
    });
  };
}
module.exports = { verifyToken, verifyRole };

