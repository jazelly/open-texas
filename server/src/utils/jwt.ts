import jwt from 'jsonwebtoken';

// In a real application, you should store this in an environment variable
const JWT_SECRET = 'your-secret-key-change-this-in-production';
const TOKEN_EXPIRY = '7d'; // Token expires in 7 days

/**
 * Generate a JWT token for the user
 */
export const generateToken = (userId: string, username: string): string => {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): { userId: string; username: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    return decoded;
  } catch (error) {
    return null;
  }
}; 