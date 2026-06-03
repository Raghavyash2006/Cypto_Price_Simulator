import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRoutes from './api/routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { requestId, securityHeaders } from './middleware/security.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { sanitizeRequest } from './middleware/requestSanitizer.js';
import { getEnv } from './config/env.js';

const app = express();
const env = getEnv();

app.disable('x-powered-by');
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(cookieParser());
app.use(requestId);
app.use(securityHeaders);
app.use(sanitizeRequest);
app.use(createRateLimiter({ windowMs: env.rateLimitWindowMs, max: env.rateLimitMax }));

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;