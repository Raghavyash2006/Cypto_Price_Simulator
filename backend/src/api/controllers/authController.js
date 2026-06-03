import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import RefreshToken from '../../models/RefreshToken.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js';
import { processReferral } from '../services/gamificationService.js';
import { getEnv } from '../../config/env.js';
import { sanitizeText } from '../../utils/inputSanitizer.js';

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, getRefreshCookieOptions());
}

export const register = asyncHandler(async (req, res) => {
  const username = sanitizeText(req.body.username, { maxLength: 30 });
  const name = sanitizeText(req.body.name, { maxLength: 80 });
  const email = sanitizeText(req.body.email, { maxLength: 254 });
  const password = String(req.body.password ?? '');
  const referralCode = sanitizeText(req.body.referralCode, { maxLength: 32 });

  if (!username || !name || !email || !password) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
  if (existing) {
    res.status(409);
    throw new Error('Email or username already in use');
  }

  console.debug('[auth] register attempt', { email: normalizedEmail, username });

  const user = await User.create({ username, name, email: normalizedEmail, password });
  await RefreshToken.deleteMany({ user: user._id });

  if (referralCode) {
    await processReferral(referralCode, user._id);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await RefreshToken.create({ user: user._id, token: refreshToken, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  setRefreshCookie(res, refreshToken);

  res.status(201).json({ user: user.toSafeObject(), accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const email = sanitizeText(req.body.email, { maxLength: 254 });
  const password = String(req.body.password ?? '');
  if (!email || !password) {
    res.status(400);
    throw new Error('Missing email or password');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  console.debug('[auth] login attempt', { email: normalizedEmail });

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    console.debug('[auth] login failed', { email: normalizedEmail, userFound: Boolean(user) });
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await RefreshToken.deleteMany({ user: user._id });
  await RefreshToken.create({ user: user._id, token: refreshToken, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  setRefreshCookie(res, refreshToken);

  console.debug('[auth] login success', { userId: user._id.toString(), username: user.username });

  res.json({ user: user.toSafeObject(), accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (token) {
    await RefreshToken.deleteOne({ token });
  }
  res.clearCookie('refreshToken', getRefreshCookieOptions());
  console.debug('[auth] logout', { hadRefreshToken: Boolean(token) });
  res.json({ message: 'Logged out' });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || String(req.body?.refreshToken || '');
  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  const { refreshSecret } = getEnv();
  try {
    jwt.verify(token, refreshSecret);
  } catch {
    res.status(401);
    throw new Error('Refresh token invalid or expired');
  }

  const stored = await RefreshToken.findOne({ token }).populate('user');
  if (!stored || stored.expires < new Date()) {
    res.status(401);
    throw new Error('Refresh token invalid or expired');
  }

  const accessToken = generateAccessToken(stored.user._id);
  const nextRefreshToken = generateRefreshToken(stored.user._id);

  await RefreshToken.deleteOne({ _id: stored._id });
  await RefreshToken.create({ user: stored.user._id, token: nextRefreshToken, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  setRefreshCookie(res, nextRefreshToken);

  console.debug('[auth] refresh success', { userId: stored.user._id.toString() });
  res.json({ accessToken, user: stored.user.toSafeObject() });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = sanitizeText(req.body.email, { maxLength: 254 });
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(200).json({ message: 'If that email exists we sent a reset link' });
    return;
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

  if (process.env.NODE_ENV === 'production') {
    res.json({ message: 'If that email exists we sent a reset link' });
    return;
  }

  res.json({ message: 'Password reset token generated', resetUrl });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password ?? '');
  if (!token || !password) {
    res.status(400);
    throw new Error('Token and new password required');
  }

  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  await RefreshToken.deleteMany({ user: user._id });

  res.json({ message: 'Password reset successful' });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});