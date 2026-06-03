import { Router } from 'express';
import v1Routes from '../v1/routes/index.js';
import aiRoutes from './aiRoutes.js';
import learnRoutes from './learnRoutes.js';

const router = Router();

router.use('/', v1Routes);
router.use('/v1', v1Routes);
router.use('/ai', aiRoutes);
router.use('/learn', learnRoutes);

export default router;