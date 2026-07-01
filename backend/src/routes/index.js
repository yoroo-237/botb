import { Router } from 'express';

import authRoutes         from './auth.routes.js';
import profileRoutes      from './profile.routes.js';
import walletRoutes       from './wallet.routes.js';
import orderRoutes        from './order.routes.js';
import productRoutes      from './product.routes.js';
import notificationRoutes from './notification.routes.js';
import ticketRoutes       from './ticket.routes.js';
import apikeyRoutes       from './apikey.routes.js';
import contentRoutes      from './content.routes.js';
import webhookRoutes      from './webhook.routes.js';
import adminRoutes        from './admin/index.js';

const router = Router();

router.use('/auth',          authRoutes);
router.use('/profile',       profileRoutes);
router.use('/wallet',        walletRoutes);
router.use('/orders',        orderRoutes);
router.use('/products',      productRoutes);
router.use('/notifications', notificationRoutes);
router.use('/tickets',       ticketRoutes);
router.use('/api-keys',      apikeyRoutes);
router.use('/content',       contentRoutes);
router.use('/webhooks',      webhookRoutes);
router.use('/admin',         adminRoutes);

export default router;
