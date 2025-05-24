import prisma from "./prisma.js";
import { generateSalt, hashPassword, verifyPassword } from "../utils/password.js";
import { UserEmailAlreadyRegistered, UserNameTaken } from "./errors.js";
import { User } from "@prisma/client";
import logger from "../utils/logger.js";

export class UserService {
  /**
   * Create a new user with credentials
   */
  async createUserWithPassword(name: string, email: string, password: string): Promise<User> {
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    
    try {
      return await prisma.$transaction(async (tx) => {
        // First create the user
        const user = await tx.user.create({
          data: { 
            name,
            email: email.toLowerCase(),
          }
        });
        
        // Then create their credential
        await tx.credential.create({
          data: {
            userId: user.id,
            passwordHash,
            salt
          }
        });
        
        return user;
      });
    } catch (error: any) {
      // Check for Prisma's unique constraint violation
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'name') {
          throw new UserNameTaken();
        } else if (field === 'email') {
          throw new UserEmailAlreadyRegistered();
        }
      }
      // Re-throw the original error if it's not a unique constraint violation
      throw error;
    }
  }

  /**
   * Authenticate a user with password
   */
  async authenticateWithPassword(username: string, password: string, requestId: string) {
    logger.info({ requestId, username }, 'Starting username authentication');
    
    try {
      const user = await prisma.user.findUnique({
        where: { name: username },
        include: {
          credential: true
        }
      });
      
      if (!user) {
        logger.warn({ requestId, username }, 'User not found for username authentication');
        return null;
      }
      
      if (!user.credential) {
        logger.warn({ requestId, username, userId: user.id }, 'User found but no credential record');
        return null;
      }
      
      logger.info({ requestId, username, userId: user.id }, 'User and credential found, verifying password');
      
      const { passwordHash, salt } = user.credential;
      
      const isPasswordValid = verifyPassword(password, salt, passwordHash);
      
      if (!isPasswordValid) {
        logger.warn({ requestId, username, userId: user.id }, 'Password verification failed');
        return null;
      }
      
      logger.info({ requestId, username, userId: user.id }, 'Password verification successful');
      
      // Don't return the credential in the response
      const { credential, ...userWithoutCredential } = user;
      return userWithoutCredential;
    } catch (error) {
      logger.error({ 
        requestId, 
        username, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error during username authentication');
      throw error;
    }
  }

  /**
   * Get a user by ID
   */
  async getUserById(id: string): Promise<any> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<any[]> {
    return prisma.user.findMany();
  }

  /**
   * Get a user by name
   */
  async getUserByName(name: string): Promise<any> {
    return prisma.user.findUnique({
      where: { name }
    });
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<any> {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Authenticate a user with email
   */
  async authenticateWithEmail(email: string, password: string, requestId: string) {
    const normalizedEmail = email.toLowerCase();
    
    logger.info({ requestId, email: normalizedEmail }, 'Starting email authentication');
    
    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          credential: true
        }
      });
      
      if (!user) {
        logger.warn({ requestId, email: normalizedEmail }, 'User not found for email authentication');
        return null;
      }
      
      if (!user.credential) {
        logger.warn({ requestId, email: normalizedEmail, userId: user.id }, 'User found but no credential record');
        return null;
      }
      
      logger.info({ requestId, email: normalizedEmail, userId: user.id, username: user.name }, 'User and credential found, verifying password');
      
      const { passwordHash, salt } = user.credential;
      
      const isPasswordValid = verifyPassword(password, salt, passwordHash);
      
      if (!isPasswordValid) {
        logger.warn({ requestId, email: normalizedEmail, userId: user.id, username: user.name }, 'Password verification failed');
        return null;
      }
      
      logger.info({ requestId, email: normalizedEmail, userId: user.id, username: user.name }, 'Password verification successful');
      
      // Don't return the credential in the response
      const { credential, ...userWithoutCredential } = user;
      return userWithoutCredential;
    } catch (error) {
      logger.error({ 
        requestId, 
        email: normalizedEmail, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error during email authentication');
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<any> {
    return prisma.user.delete({
      where: { id }
    });
  }
}

// Export a singleton instance
export const userService = new UserService(); 