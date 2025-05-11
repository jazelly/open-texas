import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
// Authentication route
router.post('/auth', userController.authenticateUser);
// Protected route for current user
router.get('/me', authenticateToken, userController.getCurrentUser);
router.delete('/:id', userController.deleteUser);

export const userRouter = router; 