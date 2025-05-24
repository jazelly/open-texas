import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware using Helmet with comprehensive CSP
 */
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      // Default source - restrict to self and specific trusted domains
      defaultSrc: ["'self'"],
      
      // Script sources - be very restrictive here to prevent XSS
      scriptSrc: [
        "'self'",
        // Allow inline scripts with nonce (recommended) or specific hashes
        "'unsafe-inline'", // Remove this in production, use nonces instead
        // Add your CDN domains if needed
        // "https://cdn.jsdelivr.net",
      ],
      
      // Style sources
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Often needed for CSS-in-JS frameworks
        // Add your CSS CDN domains if needed
        // "https://fonts.googleapis.com",
      ],
      
      // Image sources
      imgSrc: [
        "'self'",
        "data:", // Allow data URLs for images
        "blob:", // Allow blob URLs
        // Add your image CDN domains
        // "https://your-cdn.com",
      ],
      
      // Font sources
      fontSrc: [
        "'self'",
        "data:",
        // "https://fonts.gstatic.com", // Uncomment if using Google Fonts
      ],
      
      // Connect sources (for AJAX, WebSocket, etc.)
      connectSrc: [
        "'self'",
        // Add your API endpoints and WebSocket URLs
        process.env.CLIENT_URL || "http://localhost:3289",
        "http://localhost:8080",
        "https://texashold.me",
      ],
      
      // Media sources (audio/video)
      mediaSrc: ["'self'"],
      
      // Object sources (for plugins like Flash)
      objectSrc: ["'none'"], // Disable plugins entirely
      
      // Frame sources (for iframes)
      frameSrc: ["'none'"], // Disable frames entirely
      
      // Base URI restrictions
      baseUri: ["'self'"],
      
      // Form action restrictions
      formAction: ["'self'"],
      
      // Frame ancestors (prevents clickjacking)
      frameAncestors: ["'none'"],
      
      // Block mixed content
      upgradeInsecureRequests: [],
    },
    // Report violations (helpful for debugging)
    reportOnly: process.env.NODE_ENV !== 'production', // Only enforce in production
  },
  
  // Additional security headers
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
});

/**
 * Development-friendly CSP (less restrictive for development)
 */
export const developmentSecurityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval for hot reloading
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"], // Allow all connections in dev
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    reportOnly: true, // Don't enforce in development
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: 'sameorigin' },
});

/**
 * CSP middleware that adapts to environment
 */
export const adaptiveSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const middleware = process.env.NODE_ENV === 'production' 
    ? securityMiddleware 
    : developmentSecurityMiddleware;
  
  middleware(req, res, next);
};

/**
 * Additional XSS protection middleware
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Set additional XSS protection headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Sanitize request data (basic example)
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Basic sanitization function to remove potentially dangerous content
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}