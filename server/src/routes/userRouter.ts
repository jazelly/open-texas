import express from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// User routes
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
// Authentication route
router.post('/auth', userController.authenticateUser);
// Protected route for current user
router.get('/me', authenticateToken, userController.getCurrentUser);
router.put('/:id/chips', userController.updateUserChips);
router.delete('/:id', userController.deleteUser);

export const userRouter = router; 