import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export class UserGameSessionService {
  async getSessions() {
    return prisma.userGameSession.findMany();
  }
  /**
   * Create a new game session for a user
   */
  async createSession(userId: string, gameId: string, socketId: string): Promise<{ token: string }> {
    const token = randomUUID();
    const session = await prisma.userGameSession.create({
      data: {
        userId,
        gameId,
        token,
        socketId,
      }
    });

    return { token: session.token };
  }

  /**
   * Get a session by token
   */
  async getSessionByToken(token: string) {
    return prisma.userGameSession.findUnique({
      where: { token }
    });
  }

  /**
   * Get all sessions for a game
   */
  async getGameSessions(gameId: string) {
    return prisma.userGameSession.findMany({
      where: { gameId }
    });
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string) {
    return prisma.userGameSession.findMany({
      where: { userId }
    });
  }

  /**
   * Check if a user has an active session in a game
   */
  async hasActiveSession(userId: string, gameId: string): Promise<boolean> {
    const session = await prisma.userGameSession.findFirst({
      where: {
        userId,
        gameId
      }
    });
    return !!session;
  }

  /**
   * Delete a session by token
   */
  async deleteSession(token: string) {
    return prisma.userGameSession.delete({
      where: { token }
    });
  }

  /**
   * Delete all sessions for a game
   */
  async deleteGameSessions(gameId: string) {
    return prisma.userGameSession.deleteMany({
      where: { gameId }
    });
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string) {
    return prisma.userGameSession.deleteMany({
      where: { userId }
    });
  }

  /**
   * Update session last activity timestamp
   */
  async updateSessionActivity(token: string, socketId: string) {
    return prisma.userGameSession.update({
      where: { token },
      data: {
        updatedAt: new Date(),
        socketId
      }
    });
  }

  /**
   * Clean up expired sessions (older than specified hours)
   */
  async cleanupExpiredSessions(expiryHours: number = 24) {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - expiryHours);

    return prisma.userGameSession.deleteMany({
      where: {
        updatedAt: {
          lt: expiryDate
        }
      }
    });
  }
} 

export const userGameSessionService = new UserGameSessionService();