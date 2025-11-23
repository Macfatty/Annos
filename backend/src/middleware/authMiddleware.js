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

function verifyJWT(req, res, next) {
  // 1. Försök hämta från Authorization-header
  const authHeader = req.headers.authorization;
  let token;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Om ingen header: hämta från cookie (prova både 'token' och 'accessToken')
  if (!token && req.cookies) {
    token = req.cookies.token || req.cookies.accessToken;
  }

  // 3. Om fortfarande inget token: 401
  if (!token) {
    console.log('[AUTH MIDDLEWARE] No token found. Cookies:', req.cookies);
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // BACKWARD COMPATIBILITY: Support both old JWTs with 'id' and new JWTs with 'userId'
    // DO NOT REMOVE THIS - See docs/TOKEN_FLOW.md for migration strategy
    if (!decoded.userId && decoded.id) {
      decoded.userId = decoded.id;
    }

    req.user = decoded; // { userId, role, name, email, … }
    console.log('[AUTH MIDDLEWARE] Token verified for user:', decoded.email, '(userId:', decoded.userId, ')');
    return next();
  } catch (error) {
    console.log('[AUTH MIDDLEWARE] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Behåll verifyToken för bakåtkompatibilitet
function verifyToken(req, res, next) {
  return verifyJWT(req, res, next);
}

function verifyRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Administratörer har full behörighet att passera alla rollkontroller
    if (req.user.role === 'admin') {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

function verifyAdminForSlug(req, res, next) {
  verifyToken(req, res, () => {
    // Admin kan komma åt alla restauranger
    if (req.user.role === "admin") {
      return next();
    }
    
    // För icke-admin användare, kontrollera slug
    const slug = req.query?.slug || req.body?.slug || req.params?.slug;
    if (slug && req.user.restaurant_slug !== slug) {
      return res.status(403).json({ error: "Fel restaurang" });
    }
    next();
  });
}
module.exports = { 
  verifyJWT,
  verifyToken, 
  verifyRole, 
  verifyAdminForSlug,
  rateLimit,
  isValidStatusTransition,
  validateStatusTransition,
  validTransitions
};

