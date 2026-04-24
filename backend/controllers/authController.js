/**
 * Auth Controller — Demo Mode
 * No MongoDB required. Issues real JWTs signed with JWT_SECRET.
 * Any email/password is accepted as long as email and role are provided.
 * This is the ONLY auth mechanism — no silent fallbacks.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const VALID_ROLES = [
  'admin',
  'fraud_analyst',
  'department_head',
  'employee',
  'auditor',
];

const ROLE_DISPLAY_NAMES = {
  admin: 'Administrator',
  fraud_analyst: 'Fraud Analyst',
  department_head: 'Department Head',
  employee: 'Employee',
  auditor: 'Auditor',
};

async function login(req, res) {
  try {
    const { email, password, role, orgId } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }
    if (!password || password.trim() === '') {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    // Demo mode: accept any non-empty password
    const userId = `user_${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const name = ROLE_DISPLAY_NAMES[role];

    const tokenPayload = {
      id: userId,
      email,
      role,
      orgId: orgId || 'ORG001',
      name,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    logger.info(`Login success: ${email} as ${role} from ${orgId || 'ORG001'}`);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        email,
        role,
        orgId: orgId || 'ORG001',
      },
    });
  } catch (error) {
    logger.error('POST /api/auth/login error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { login };
