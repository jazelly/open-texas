import crypto from 'crypto';
import logger from './logger.js';

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
  const requestId = Math.random().toString(36).substring(7);
  
  logger.debug({ 
    requestId,
    hasPassword: !!password,
    passwordLength: password?.length || 0,
    hasSalt: !!salt,
    saltLength: salt?.length || 0,
    hasHash: !!hash,
    hashLength: hash?.length || 0
  }, 'Starting password verification');
  
  try {
    const passwordHash = hashPassword(password, salt);
    const isMatch = passwordHash === hash;
    
    logger.debug({ 
      requestId,
      isMatch,
      computedHashLength: passwordHash.length,
      expectedHashLength: hash.length
    }, 'Password verification result');
    
    return isMatch;
  } catch (error) {
    logger.error({ 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error during password verification');
    return false;
  }
}; 