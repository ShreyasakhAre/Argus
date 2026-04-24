const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_FOR_DEV';

/**
 * Valid ARGUS roles — matches the frontend Role type exactly.
 */
const VALID_ROLES = [
  'admin',
  'fraud_analyst',
  'department_head',
  'employee',
  'auditor',
];

/**
 * Verify Bearer JWT and attach decoded payload to req.user.
 */
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Missing or invalid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Token expired or invalid.',
    });
  }
};

/**
 * Authorize by role. Accepts multiple allowed roles.
 * Works with the full ARGUS role set: admin | fraud_analyst | department_head | employee | auditor
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Forbidden. No role found.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not allowed for this resource.`,
      });
    }
    next();
  };
};

/**
 * Alias for routes that use the legacy `authenticateToken` name.
 */
const authenticateToken = authenticateUser;

/**
 * Alias for routes that use the legacy `requireRole` name (accepts array).
 */
const requireRole = (roles) => authorizeRoles(...(Array.isArray(roles) ? roles : [roles]));

module.exports = {
  authenticateUser,
  authenticateToken,
  authorizeRoles,
  requireRole,
  JWT_SECRET,
};
