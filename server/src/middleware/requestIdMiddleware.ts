import { Request, Response, NextFunction } from 'express';
import { v4 } from 'uuid';

/**
 * Middleware to generate a unique requestId and attach it to the request
 * This allows tracking requests throughout their lifecycle
 */
export const generateRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = v4();
  next();
}; 