import { getEnv } from '../../config/env.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export function getHealth(req, res) {
  const env = getEnv();

  return sendSuccess(res, {
    message: 'API healthy',
    data: {
      service: 'crypto-simulator-api',
      requestId: req.requestId || null,
      version: env.apiVersion,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime())
    }
  });
}
