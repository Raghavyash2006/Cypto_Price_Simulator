import { sanitizeObjectKeys } from '../utils/inputSanitizer.js';

function sanitizeContainer(value) {
  if (Array.isArray(value) || (value && Object.getPrototypeOf(value) === Object.prototype)) {
    return sanitizeObjectKeys(value);
  }

  return value;
}

function mutateContainer(target, sanitized) {
  if (!target || target === sanitized) {
    return target;
  }

  if (Array.isArray(target) && Array.isArray(sanitized)) {
    target.length = 0;
    target.push(...sanitized);
    return target;
  }

  if (target && Object.getPrototypeOf(target) === Object.prototype && sanitized && Object.getPrototypeOf(sanitized) === Object.prototype) {
    for (const key of Object.keys(target)) {
      delete target[key];
    }

    Object.assign(target, sanitized);
  }

  return target;
}

export function sanitizeRequest(req, _res, next) {
  if (req.body) {
    mutateContainer(req.body, sanitizeContainer(req.body));
  }

  if (req.query) {
    mutateContainer(req.query, sanitizeContainer(req.query));
  }

  if (req.params) {
    mutateContainer(req.params, sanitizeContainer(req.params));
  }

  next();
}
