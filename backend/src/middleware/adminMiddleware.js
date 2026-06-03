import { AppError } from '../utils/AppError.js';

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new AppError('Not authorized', 401));
  }

  if (!req.user.isAdmin) {
    return next(new AppError('Admin access required', 403));
  }

  return next();
}
