import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes
router.get('/', userController.getAllUsers);

router.post('/signup', userController.signup);
router.post('/signin', userController.signin);

// Protected route for current user
router.get('/me', authenticateToken, userController.getCurrentUser);
router.delete('/:id', userController.deleteUser);

// Error handling middleware must be placed after all routes
router.use(userController.handleError);

export const userRouter = router; 