import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

function getMissingFields(source, required = []) {
  const missing = [];

  for (const key of required) {
    if (source?.[key] === undefined || source?.[key] === null || source?.[key] === '') {
      missing.push(key);
    }
  }

  return missing;
}

export function validateRequest({ body = [], query = [], params = [] } = {}) {
  return (req, _res, next) => {
    const missing = [
      ...getMissingFields(req.body, body).map((field) => `body.${field}`),
      ...getMissingFields(req.query, query).map((field) => `query.${field}`),
      ...getMissingFields(req.params, params).map((field) => `params.${field}`)
    ];

    if (missing.length) {
      return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
    }

    return next();
  };
}

export function validateBody(required = []) {
  return validateRequest({ body: required });
}

export function validateObjectId(paramName = 'id') {
  return (req, _res, next) => {
    const value = req.params?.[paramName];
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return next(new AppError(`Invalid ${paramName}`, 400));
    }

    return next();
  };
}
