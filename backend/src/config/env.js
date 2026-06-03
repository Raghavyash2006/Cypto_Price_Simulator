import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');

// Load the backend .env file from a stable path so startup works from any working directory.
dotenv.config({ path: envFilePath });

export function getEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProductionEnv = nodeEnv === 'production';
  const jwtSecret = process.env.JWT_SECRET || (isProductionEnv ? '' : 'dev-jwt-secret');
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || (isProductionEnv ? '' : 'dev-refresh-secret');

  if (isProductionEnv) {
    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be set in production');
    }

    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET must be set in production');
    }
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT || 5000),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    mongoUri: process.env.MONGODB_URI || '',
    jwtSecret,
    jwtExpires: process.env.JWT_EXPIRES || '15m',
    refreshSecret,
    refreshExpires: process.env.REFRESH_EXPIRES || '30d',
    apiVersion: process.env.API_VERSION || 'v1',
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
    mailHost: process.env.MAIL_HOST || '',
    mailPort: Number(process.env.MAIL_PORT || 587),
    mailUser: process.env.MAIL_USER || '',
    mailPass: process.env.MAIL_PASS || ''
  };
}

export function isProduction() {
  return getEnv().nodeEnv === 'production';
}
