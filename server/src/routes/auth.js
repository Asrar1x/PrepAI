const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const { authLimiter } = require('../middleware/rateLimiter');
const { protect, getJwtSecret } = require('../middleware/auth');
const { sendEmailNotification } = require('../services/emailService');
const appConfig = require('../config/env');
const { audit } = require('../services/observability');

const router = express.Router();

// Short-lived access token + longer refresh token (spec §24). Both carry the user's token
// version so logout can revoke every outstanding token.
const generateTokens = (user) => {
  const secret = getJwtSecret();
  const tv = user.tokenVersion || 0;
  const accessToken = jwt.sign(
    { id: user._id.toString(), sub: user._id.toString(), role: user.role, typ: 'access', tv },
    secret,
    { expiresIn: `${appConfig.auth.accessTtlMinutes}m` }
  );
  const refreshToken = jwt.sign(
    { id: user._id.toString(), sub: user._id.toString(), typ: 'refresh', tv, jti: crypto.randomBytes(8).toString('hex') },
    secret,
    { expiresIn: `${appConfig.auth.refreshTtlDays}d` }
  );
  return { accessToken, refreshToken, expiresIn: appConfig.auth.accessTtlMinutes * 60 };
};

// POST /register
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const textField = (v, fallback, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback);

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ detail: 'Please enter a valid email address' });
    }
    if (typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ detail: 'Password must be text of at most 128 characters' });
    }

    const fullName = textField(req.body.full_name || req.body.fullName || req.body.name, 'Student Candidate', 100);
    const collegeName = textField(req.body.college_name || req.body.collegeName, 'Campus University', 150);
    const branch = textField(req.body.branch, 'Computer Science', 100);
    const year = Number(req.body.graduation_year || req.body.graduationYear || 2026);
    const graduationYear = Number.isInteger(year) && year >= 2000 && year <= 2040 ? year : 2026;
    const rolesInput = req.body.target_roles || req.body.targetRoles;
    const roleList = (Array.isArray(rolesInput) ? rolesInput : [rolesInput]).map(r => textField(r, null, 100)).filter(Boolean).slice(0, 5);
    const targetRoles = roleList.length ? roleList : ['Software Developer (SDE)'];

    if (password.length < 8) {
      return res.status(400).json({ detail: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ detail: 'An account with this email already exists. Please sign in instead.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName,
      collegeName,
      branch,
      graduationYear,
      targetRoles,
      // Self-registration always creates a student account; elevated roles are granted by an admin.
      role: 'student'
    });

    const { accessToken, refreshToken } = generateTokens(newUser);
    const userJson = {
      ...newUser.toJSON(),
      name: newUser.fullName || 'Student Candidate'
    };

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: userJson,
        token: accessToken,
        access_token: accessToken,
        accessToken,
        refresh_token: refreshToken,
        refreshToken,
        token_type: 'bearer'
      },
      token: accessToken,
      access_token: accessToken,
      accessToken,
      refresh_token: refreshToken,
      refreshToken,
      token_type: 'bearer',
      user: userJson
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ detail: 'Internal server error during registration' });
  }
});

// POST /login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ detail: 'Email and password must be text' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ detail: 'No account found with this email. Please click Sign Up below.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid email or password. Please check your credentials.' });
    }
    // A deactivated account must not receive tokens (every later call would fail anyway)
    if (user.isActive === false) {
      return res.status(403).json({ detail: 'This account has been deactivated. Please contact your placement officer.' });
    }

    user.lastActive = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);
    const userJson = {
      ...user.toJSON(),
      name: user.fullName || user.email.split('@')[0]
    };

    res.json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        user: userJson,
        token: accessToken,
        access_token: accessToken,
        accessToken,
        refresh_token: refreshToken,
        refreshToken,
        token_type: 'bearer'
      },
      token: accessToken,
      access_token: accessToken,
      accessToken,
      refresh_token: refreshToken,
      refreshToken,
      token_type: 'bearer',
      user: userJson
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Internal server error during login' });
  }
});

// POST /refresh
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const refresh_token = req.body.refresh_token || req.body.refreshToken;
    if (!refresh_token) {
      return res.status(400).json({ detail: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refresh_token, getJwtSecret());
    if (decoded.typ !== 'refresh') {
      return res.status(401).json({ detail: 'Invalid refresh token' });
    }
    const user = await User.findById(decoded.id || decoded.sub);
    if (!user || !user.isActive || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
      return res.status(401).json({ detail: 'Session expired. Please sign in again.' });
    }

    const { accessToken, refreshToken: newRefreshToken, expiresIn } = generateTokens(user);
    // Same token fields as /login and /register
    res.json({
      status: 'success',
      data: {
        token: accessToken,
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: 'bearer',
        expires_in: expiresIn
      },
      token: accessToken,
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer',
      expires_in: expiresIn
    });
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid refresh token' });
  }
});

// POST /logout — bumps the token version, revoking every access and refresh token of the user
router.post('/logout', protect, async (req, res) => {
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  await req.user.save();
  await audit(req, 'auth.logout', { targetType: 'user', targetId: req.user._id });
  res.json({ status: 'success', message: 'Logged out' });
});

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// POST /forgot-password — issues a 6-digit OTP. Always responds the same way so
// the endpoint cannot be used to discover which emails are registered.
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ detail: 'Email is required' });
    }
    const user = await User.findOne({ email });
    if (user) {
      const otp = String(crypto.randomInt(100000, 1000000));
      user.resetOtpHash = hashOtp(otp);
      user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
      user.resetOtpAttempts = 0;
      await user.save();
      await sendEmailNotification({
        to: user.email,
        subject: 'PrepAI password reset code',
        htmlContent: `<p>Your PrepAI password reset code is <b>${otp}</b>. It expires in 15 minutes.</p>`
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Auth] Password reset OTP for ${user.email}: ${otp} (dev only — no SMTP configured)`);
      }
    }
    res.json({ status: 'success', message: 'If an account exists for this email, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ detail: 'Unable to process password reset request' });
  }
});

// POST /reset-password — { email, otp, password }
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    const password = String(req.body.password || '');
    if (!email || !otp || !password) {
      return res.status(400).json({ detail: 'Email, verification code and new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ detail: 'Password must be at least 8 characters long' });
    }
    // Same upper bound as login/register, so a reset can never create a password login rejects
    if (password.length > 128) {
      return res.status(400).json({ detail: 'Password must be at most 128 characters long' });
    }

    const user = await User.findOne({ email });
    const invalid = () => res.status(400).json({ detail: 'Invalid or expired verification code' });
    if (!user || !user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) {
      return invalid();
    }
    if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      await user.save();
      return invalid();
    }
    if (hashOtp(otp) !== user.resetOtpHash) {
      user.resetOtpAttempts += 1;
      await user.save();
      return invalid();
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.resetOtpHash = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await audit(req, 'auth.password_reset', { targetType: 'user', targetId: user._id });
    res.json({ status: 'success', message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ detail: 'Unable to reset password' });
  }
});

// GET /me — convenience alias used to validate a stored session
router.get('/me', protect, (req, res) => {
  res.json({ status: 'success', data: { ...req.user.toJSON(), name: req.user.fullName } });
});

module.exports = router;
