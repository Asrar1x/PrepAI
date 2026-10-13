const jwt = require('jsonwebtoken');
const User = require('../models/User');

const appConfig = require('../config/env');

const getJwtSecret = () => appConfig.auth.jwtSecret;

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return null;
}

async function resolveUserFromToken(token) {
  const decoded = jwt.verify(token, getJwtSecret());
  // Refresh tokens are not accepted as access tokens
  if (decoded.typ && decoded.typ !== 'access') return null;
  const user = await User.findById(decoded.id || decoded.sub);
  if (!user) return null;
  // Tokens issued before logout / password reset are revoked
  if ((user.tokenVersion || 0) !== (decoded.tv || 0)) return null;
  return user;
}

// Requires a valid access token. There is no anonymous or dev fallback user:
// every protected route must be called with the caller's own JWT.
const protect = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ detail: 'Authentication required' });
  }

  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      return res.status(401).json({ detail: 'Session expired. Please sign in again.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ detail: 'Inactive user' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
};

// Attaches req.user when a valid token is present, but never rejects the request.
const optionalAuth = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (token) {
    try {
      const user = await resolveUserFromToken(token);
      if (user && user.isActive) req.user = user;
    } catch {
      // Treat an invalid token as anonymous
    }
  }
  next();
};

const requireRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ detail: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Operation not permitted' });
    }
    next();
  };
};

module.exports = { protect, optionalAuth, requireRoles, getJwtSecret };
