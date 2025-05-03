import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GameService {
  /**
   * Create a new game
   */
  async createGame(name: string, maxPlayers: number, creatorId: string): Promise<any> {
    // Create the game
    const game = await prisma.game.create({
      data: {
        name,
        maxPlayers
      }
    });

    // Add creator to waiting room
    await prisma.user.update({
      where: { id: creatorId },
      data: {
        gameId: game.id,
        isWaiting: true
      }
    });

    // Return the game with simulated relationships for backwards compatibility
    return this.getGameById(game.id);
  }

  /**
   * Get all active games with their players
   */
  async getActiveGames(): Promise<any[]> {
    // Get all active games
    const games = await prisma.game.findMany({
      where: { isActive: true }
    });

    return games;
  }

  /**
   * Get all games
   */
  async getAllGames(): Promise<any[]> {
    // Get all games
    const games = await prisma.game.findMany();

    return games; 
  }

  /**
   * Get a game by ID
   */
  async getGameById(id: string): Promise<any> {
    // Get the game
    const game = await prisma.game.findUnique({
      where: { id }
    });

    if (!game) {
      return null;
    }

    return game;
  }

  /**
   * Add a player to the waiting room
   */
  async addPlayerToWaitingRoom(gameId: string, userId: string): Promise<any> {
    // First check if user is already in a game
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user && user.gameId && user.gameId !== gameId) {
      // Remove from the previous game first
      await prisma.user.update({
        where: { id: userId },
        data: {
          gameId: null,
          isWaiting: false
        }
      });
    }

    // Add user to waiting room
    await prisma.user.update({
      where: { id: userId },
      data: {
        gameId: gameId,
        isWaiting: true
      }
    });

    // Return the updated game
    return this.getGameById(gameId);
  }

  /**
   * Move a player from waiting room to active game
   */
  async movePlayerToGame(gameId: string, userId: string, position?: number): Promise<any> {
    // If position not provided, find the next available position
    if (position === undefined) {
      const game = await this.getGameById(gameId);
      const occupiedPositions = game.players.map((p: any) => p.position);
      position = 0;
      
      // Find the first available position
      while (occupiedPositions.includes(position)) {
        position++;
      }
    }

    // Update the user to be an active player with the specified position
    await prisma.user.update({
      where: { id: userId },
      data: {
        isWaiting: false,
        position: position
      }
    });

    // Return the updated game
    return this.getGameById(gameId);
  }

  /**
   * Remove a player from a game
   */
  async removePlayerFromGame(gameId: string, userId: string, isActivePlayer: boolean): Promise<any> {
    // Remove the user from the game
    await prisma.user.update({
      where: { id: userId },
      data: {
        gameId: null,
        isWaiting: false,
        position: 0 // Reset position
      }
    });

    // Return the updated game
    return this.getGameById(gameId);
  }

  /**
   * Update game state in history
   */
  async updateGameHistory(gameId: string, gameState: any): Promise<any> {
    // Get current game to access history
    const currentGame = await prisma.game.findUnique({
      where: { id: gameId },
      select: { gameHistory: true }
    });
    
    if (!currentGame) {
      throw new Error('Game not found');
    }
    
    // Add current state to history with timestamp
    const historyEntry = {
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(gameState)) // Ensure it's valid JSON
    };
    
    // Update game with new history (append the new entry)
    return prisma.game.update({
      where: { id: gameId },
      data: { 
        gameHistory: {
          push: historyEntry
        }
      }
    });
  }

  /**
   * Update a game's active status
   */
  async updateGameStatus(gameId: string, isActive: boolean): Promise<any> {
    return prisma.game.update({
      where: { id: gameId },
      data: { isActive }
    });
  }

  /**
   * Delete a game
   */
  async deleteGame(gameId: string): Promise<any> {
    // First update all users associated with this game
    await prisma.user.updateMany({
      where: { gameId: gameId },
      data: {
        gameId: null,
        isWaiting: false
      }
    });

    // Then delete the game
    return prisma.game.delete({
      where: { id: gameId }
    });
  }
}

// Export a singleton instance
export const gameService = new GameService(); 