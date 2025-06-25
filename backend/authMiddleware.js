const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  let token;
  if (req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
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

function verifyAdminForSlug(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Otillräcklig behörighet" });
    }
    const slug = req.query?.slug || req.body?.slug || req.params?.slug;
    if (slug && req.user.restaurangSlug !== slug) {
      return res.status(403).json({ error: "Fel restaurang" });
    }
    next();
  });
}
module.exports = { verifyToken, verifyRole, verifyAdminForSlug };

