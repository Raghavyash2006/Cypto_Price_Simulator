import { Router } from 'express';
import { login, register, getMe, logout, refresh, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../../middleware/authMiddleware.js';
import { validateBody } from '../../middleware/validate.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';

const router = Router();
const authRateLimit = createRateLimiter({
	keyPrefix: 'auth',
	windowMs: 10 * 60 * 1000,
	max: 10,
	message: 'Too many authentication attempts, please wait a few minutes.'
});

router.post('/register', authRateLimit, validateBody(['username', 'name', 'email', 'password']), register);
router.post('/login', authRateLimit, validateBody(['email', 'password']), login);
router.post('/logout', authRateLimit, logout);
router.post('/refresh', authRateLimit, refresh);
router.post('/forgot', authRateLimit, validateBody(['email']), forgotPassword);
router.post('/reset', authRateLimit, validateBody(['token', 'password']), resetPassword);
router.get('/me', protect, getMe);

export default router;