import { buildApiResponse } from '../utils/apiResponse.js';
import { isProduction } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  const response = buildApiResponse({
    success: false,
    message: err.message || 'Server error'
  });

  if (!isProduction()) {
    response.error = {
      name: err.name,
      stack: err.stack
    };
  }

  res.status(statusCode).json(response);
}