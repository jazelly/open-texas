import jwt from 'jsonwebtoken';

// In a real application, you should store this in an environment variable
export const JWT_SECRET = process.env.JWT_SECRET!;
export const TOKEN_EXPIRY = '7d'; // Token expires in 7 days

/**
 * Generate a JWT token for the user
 */
export const generateAuthToken = (userId: string, username: string, secret: string): string => {
  return jwt.sign(
    { userId, username },
    secret,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string, secret: string): any | null => {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    return null;
  }
}; 