const jwt = require("jsonwebtoken");

// Rate limiting storage (i produktion bör detta vara Redis eller liknande)
const rateLimitStore = new Map();

// Rate limiting middleware
function rateLimit(windowMs, maxRequests) {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Rensa gamla entries
    if (rateLimitStore.has(key)) {
      const requests = rateLimitStore.get(key).filter(time => time > windowStart);
      rateLimitStore.set(key, requests);
    } else {
      rateLimitStore.set(key, []);
    }
    
    const requests = rateLimitStore.get(key);
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({ error: "För många förfrågningar" });
    }
    
    requests.push(now);
    next();
  };
}

// Statusmaskin för ordrar
const validTransitions = {
  'received': ['accepted'],
  'accepted': ['in_progress'],
  'in_progress': ['out_for_delivery'],
  'out_for_delivery': ['delivered'],
  'delivered': [] // Slutstatus
};

function isValidStatusTransition(currentStatus, newStatus) {
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

function validateStatusTransition(req, res, next) {
  const { currentStatus, newStatus } = req.body;
  
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return res.status(409).json({
      error: "Ogiltig statusövergång",
      currentStatus,
      requestedStatus: newStatus,
      allowedTransitions: validTransitions[currentStatus] || []
    });
  }
  
  next();
}

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

function verifyRole(requiredRoles) {
  return (req, res, next) => {
    verifyToken(req, res, () => {
      const userRole = req.user.role;
      const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      if (!allowedRoles.includes(userRole)) {
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
module.exports = { 
  verifyToken, 
  verifyRole, 
  verifyAdminForSlug,
  rateLimit,
  isValidStatusTransition,
  validateStatusTransition,
  validTransitions
};

