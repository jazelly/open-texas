import crypto from 'crypto';

/**
 * Generates a random salt for password hashing
 */
export const generateSalt = (length: number = 16): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hashes a password with the provided salt
 */
export const hashPassword = (password: string, salt: string): string => {
  return crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
};

/**
 * Verifies if a password matches a hash
 */
export const verifyPassword = (
  password: string,
  salt: string,
  hash: string
): boolean => {
  const passwordHash = hashPassword(password, salt);
  return passwordHash === hash;
}; 