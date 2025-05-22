import prisma from "./prisma.js";
import { generateSalt, hashPassword, verifyPassword } from "../utils/password.js";
import { UserEmailAlreadyRegistered, UserNameTaken } from "./errors.js";
import { User } from "@prisma/client";

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
            email,
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
  async authenticateWithPassword(username: string, password: string): Promise<any | null> {
    const user = await prisma.user.findUnique({
      where: { name: username },
      include: {
        credential: true
      }
    });
    
    if (!user || !user.credential) {
      return null;
    }
    
    const { passwordHash, salt } = user.credential;
    
    if (!verifyPassword(password, salt, passwordHash)) {
      return null;
    }
    
    // Don't return the credential in the response
    const { credential, ...userWithoutCredential } = user;
    return userWithoutCredential;
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
  async authenticateWithEmail(email: string, password: string): Promise<any | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        credential: true
      }
    });
    
    if (!user || !user.credential) {
      return null;
    }
    
    const { passwordHash, salt } = user.credential;
    
    if (!verifyPassword(password, salt, passwordHash)) {
      return null;
    }
    
    // Don't return the credential in the response
    const { credential, ...userWithoutCredential } = user;
    return userWithoutCredential;
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