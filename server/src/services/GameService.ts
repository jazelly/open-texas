import { Game, PrismaClient } from "@prisma/client";
import { gameManager } from "./GameManager.js";
import { TexasHoldemGame } from "../models/TexasHoldemGame.js";
import { Player } from "../models/Player.js";
const prisma = new PrismaClient();

export class GameService {
  /**
   * Create a new game
   */
  async createGame(
    name: string,
    maxPlayers: number,
    creatorId: string
  ): Promise<any> {
    // Create the game
    const game = await prisma.game.create({
      data: {
        name,
        maxPlayers,
        hostId: creatorId,
      },
    });

    // create a game and add to game manager
    const texasHoldemGame = new TexasHoldemGame(game.id, name, creatorId, 50000, maxPlayers);
    gameManager.addGame(texasHoldemGame);

    // Return the game with simulated relationships for backwards compatibility
    return this.getGameById(game.id);
  }

  /**
   * Get all active games with their players
   */
  async getActiveGames(): Promise<any[]> {
    // Get all active games
    const dbGames = await prisma.game.findMany({
      where: { isActive: true },
    });

    const games = dbGames.filter((dbGame) => !!gameManager.getGame(dbGame.id));

    const players = await prisma.user.findMany({
      where: { gameId: { in: games.map((game) => game.id) } },
    });

    return games.map((game) => ({
      ...game,
      players: players.filter((player) => player.gameId === game.id && !player.isWaiting),
      waitingPlayers: players.filter((player) => player.gameId === game.id && player.isWaiting),
    }));
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
  async getGameById(id: string): Promise<Game | null> {
    // Get the game
    const game = await prisma.game.findUnique({
      where: { id },
    });
    return game;
  }

  /**
   * Get a joinable game by ID
   */
  async getJoinableGameById(id: string): Promise<any> {
    const game = await prisma.game.findUnique({
      where: { id, isActive: true },
    });

    if (!game) {
      return null;
    }

    if (game.updatedAt < new Date(Date.now() - 1000 * 60 * 10)) {
      return null;
    }

    return game;
  }

  /**
   * Add a player to the waiting room
   */
  async addPlayerToWaitingRoom(gameId: string, userId: string): Promise<any> {
    const game = gameManager.getGame(gameId);
    if (!game) throw new Error("Game not found");
    // First check if user is already in a game
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("User not found");

    // Add user to waiting room
    await prisma.user.update({
      where: { id: userId },
      data: {
        gameId: gameId,
        isWaiting: true,
      },
    });

    const playerObj = new Player(userId, user.name, user.chips);
    game.addPlayerToWaitingList(playerObj);

    // Return the updated game
    return this.getGameById(gameId);
  }

  /**
   * Move a player from waiting room to active game
   */
  async movePlayerToGame(
    gameId: string,
    userId: string,
    position: number
  ): Promise<void> {
    const game = gameManager.getGame(gameId);
    if (!game) throw new Error("Game not found");
    game.movePlayerFromWaitingListToSeat(userId, position);

    await prisma.user.update({
      where: { id: userId },
      data: {
        isWaiting: false,
        position: position,
      },
    });
  }

  /**
   * Remove a player from a game
   */
  async removePlayerFromGame(
    gameId: string,
    userId: string,
    isActivePlayer: boolean
  ): Promise<any> {
    // Remove the user from the game
    await prisma.user.update({
      where: { id: userId },
      data: {
        gameId: null,
        isWaiting: false,
        position: 0, // Reset position
      },
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
      select: { gameHistory: true },
    });

    if (!currentGame) {
      throw new Error("Game not found");
    }

    // Add current state to history with timestamp
    const historyEntry = {
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(gameState)), // Ensure it's valid JSON
    };

    // Update game with new history (append the new entry)
    return prisma.game.update({
      where: { id: gameId },
      data: {
        gameHistory: {
          push: historyEntry,
        },
      },
    });
  }

  /**
   * Update a game's active status
   */
  async updateGameStatus(gameId: string, isActive: boolean): Promise<any> {
    return prisma.game.update({
      where: { id: gameId },
      data: { isActive },
    });
  }

  /**
   * Delete a game
   */
  async deleteGame(gameId: string): Promise<any> {
    await prisma.user.updateMany({
      where: { gameId: gameId },
      data: {
        gameId: null,
        isWaiting: false,
      },
    });

    // Then delete the game
    return prisma.game.delete({
      where: { id: gameId },
    });
  }
}

// Export a singleton instance
export const gameService = new GameService();
