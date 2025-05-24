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
import logger from '../utils/logger.js';

/**
 * Handle specific error types and send appropriate response
 */
export const handleError = (error: any, req: Request, res: Response, next: Function): void => {
  logger.error({ error: error.message, stack: error.stack, url: req.url, method: req.method }, 'Error in controller');
  
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
  const requestId = req.requestId!; // RequestId is guaranteed to exist due to middleware
  
  try {
    const { username, password } = req.body;
    
    // Add detailed logging for debugging
    logger.info({
      requestId,
      username,
      hasPassword: !!password,
      passwordLength: password?.length || 0,
      isEmail: username?.includes('@'),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }, 'Sign in attempt');
    
    if (!username || !password) {
      logger.warn({ requestId, username, hasPassword: !!password }, 'Missing credentials in signin request');
      throw new ValidationError('Username/email and password are required');
    }
    
    // Check if the input is an email (contains @ symbol)
    const isEmail = username.includes('@');
    
    let user;
    if (isEmail) {
      logger.info({ requestId, email: username.toLowerCase() }, 'Attempting email authentication');
      user = await userService.authenticateWithEmail(username, password, requestId);
    } else {
      logger.info({ requestId, username }, 'Attempting username authentication');
      user = await userService.authenticateWithPassword(username, password, requestId);
    }
    
    if (!user) {
      logger.warn({ 
        requestId, 
        username, 
        isEmail,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      }, 'Authentication failed - invalid credentials');
      throw new InvalidCredentials();
    }
    
    logger.info({ 
      requestId, 
      userId: user.id, 
      username: user.name,
      loginMethod: isEmail ? 'email' : 'username'
    }, 'Authentication successful');
    
    const token = generateAuthToken(user.id, user.name, JWT_SECRET);
    
    res.json({
      token,
      user,
    });
  } catch (error) {
    logger.error({ 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: req.url,
      method: req.method,
      body: { ...req.body, password: req.body?.password ? '[REDACTED]' : undefined }
    }, 'Sign in error');
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
