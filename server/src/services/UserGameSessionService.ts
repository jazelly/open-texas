import prisma from "./prisma.js";
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// Configure JWT for game sessions
const GAME_JWT_SECRET = process.env.GAME_JWT_SECRET!; // Use env var in production
const GAME_TOKEN_EXPIRY = '4h'; // Token expires in 4 hours

interface GameSessionPayload {
  gameId: string;
  userId: string;
  sessionId: string;
  socketId: string;
  exp?: number;
}

export class UserGameSessionService {
  async getSessions() {
    return prisma.userGameSession.findMany();
  }
  /**
   * Create a new game session for a user
   */
  async createSession(userId: string, gameId: string, socketId: string): Promise<{ token: string }> {
    // Generate a session ID (for database reference)
    const sessionId = randomUUID();
    
    // Create JWT token with game session data
    const payload: GameSessionPayload = {
      gameId,
      userId,
      sessionId,
      socketId
    };
    
    const token = jwt.sign(
      payload,
      GAME_JWT_SECRET,
      { expiresIn: GAME_TOKEN_EXPIRY }
    );
    
    // Store session in database with JWT token
    const session = await prisma.userGameSession.create({
      data: {
        id: sessionId, // Use the generated UUID as the session ID
        userId,
        gameId,
        token,
        socketId,
      }
    });

    return { token: session.token };
  }

  /**
   * Verify and decode a game session token
   */
  verifySessionToken(token: string): GameSessionPayload | null {
    try {
      const decoded = jwt.verify(token, GAME_JWT_SECRET) as GameSessionPayload;
      return decoded;
    } catch (error) {
      console.error('Error verifying game session token:', error);
      return null;
    }
  }

  /**
   * Refresh a session token
   */
  async refreshSessionToken(token: string): Promise<{ token: string } | null> {
    try {
      // Verify the current token
      const payload = this.verifySessionToken(token);
      if (!payload) return null;

      // Get the current session from database
      const session = await this.getSessionByToken(token);
      if (!session) return null;

      // Generate a new token with the same session ID
      const newToken = jwt.sign(
        {
          gameId: payload.gameId,
          userId: payload.userId,
          sessionId: payload.sessionId,
          socketId: payload.socketId
        },
        GAME_JWT_SECRET,
        { expiresIn: GAME_TOKEN_EXPIRY }
      );

      // Update the token in the database
      await prisma.userGameSession.update({
        where: { id: session.id },
        data: { token: newToken, updatedAt: new Date() }
      });

      return { token: newToken };
    } catch (error) {
      console.error('Error refreshing game session token:', error);
      return null;
    }
  }

  /**
   * Get a session by token
   */
  async getSessionByToken(token: string) {
    return prisma.userGameSession.findUnique({
      where: { token }
    });
  }

  async getSessionsBySocketId(socketId: string) {
    return prisma.userGameSession.findMany({
      where: { socketId }
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