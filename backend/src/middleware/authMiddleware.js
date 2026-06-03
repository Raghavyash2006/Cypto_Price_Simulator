import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { getEnv } from '../config/env.js';

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Not authorized', 401));
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getEnv().jwtSecret);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    if (req.user.isActive === false) {
      return next(new AppError('Account suspended', 403));
    }

    next();
  } catch {
    return next(new AppError('Not authorized', 401));
  }
}