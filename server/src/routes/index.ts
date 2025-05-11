import express from 'express';
import { userRouter } from './userRouter.js';
import { gameRouter } from './gameRouter.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount domain-specific routers
router.use('/users', userRouter);
router.use('/games', gameRouter);

export const apiRoutes = router; 