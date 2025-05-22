import { Request, Response } from 'express';
import { userService } from '../services/UserService.js';
import { generateAuthToken, JWT_SECRET } from '../utils/jwt.js';
import {
  AppError,
  UserNameTaken,
  InvalidCredentials,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  UserEmailAlreadyRegistered
} from '../services/errors.js';

/**
 * Handle specific error types and send appropriate response
 */
export const handleError = (error: any, req: Request, res: Response, next: Function): void => {
  console.error('Error in controller:', error);
  
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.name,
    });
  } else {
    res.status(500).json({
      error: 'An unexpected error occurred',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Get all users
 */
export const getAllUsers = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a user by ID
 */
export const getUserById = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Sign up a new user with password
 */
export const signup = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !password || !email) {
      throw new ValidationError('Name, email and password are required');
    }
    
    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }
    
    const user = await userService.createUserWithPassword(name, email, password);
    const token = generateAuthToken(user.id, user.name, JWT_SECRET);
    
    res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sign in a user with password
 */
export const signin = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      throw new ValidationError('Username/email and password are required');
    }
    
    // Check if the input is an email (contains @ symbol)
    const isEmail = username.includes('@');
    
    let user;
    if (isEmail) {
      // Authenticate with email
      user = await userService.authenticateWithEmail(username, password);
    } else {
      // Authenticate with username
      user = await userService.authenticateWithPassword(username, password);
    }
    
    if (!user) {
      throw new InvalidCredentials();
    }
    
    const token = generateAuthToken(user.id, user.name, JWT_SECRET);
    
    res.json({
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const { id } = req.params;
    
    await userService.deleteUser(id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedError();
    }
    
    const user = await userService.getUserById(req.user.userId);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};
