import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';

export function generateAccessToken(id) {
  const env = getEnv();
  return jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpires });
}

export function generateRefreshToken(id) {
  const env = getEnv();
  return jwt.sign({ id }, env.refreshSecret, { expiresIn: env.refreshExpires });
}