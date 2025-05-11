import { Player } from '../models/Player.js';
import { TexasHoldemGame } from '../models/TexasHoldemGame.js';

export class GameManager {
  private games: Map<string, TexasHoldemGame>;

  constructor() {
    this.games = new Map();
  }

  // Add a new game to the manager
  addGame(game: TexasHoldemGame): void {
    this.games.set(game.id, game);
  }

  // Remove a game from the manager
  removeGame(gameId: string): void {
    this.games.delete(gameId);
  }

  // Get a game by ID
  getGame(gameId: string): TexasHoldemGame | undefined {
    return this.games.get(gameId);
  }

  getWaitingPlayers(gameId: string): Map<string, Player> {
    const game = this.games.get(gameId);
    if (!game) return new Map();
    return game.waitingPlayers;
  }

  removePlayerFromWaitingRoom(gameId: string, playerName: string): void {
    const game = this.games.get(gameId);
    if (!game) return;
    game.waitingPlayers.delete(playerName);
  }

  removePlayersFromWaitingRoom(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;
    game.waitingPlayers.clear();
  }

  // Get all active games
  getActiveGames(): Array<{
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
  }> {
    return Array.from(this.games.values()).map(game => ({
      id: game.id,
      name: game.name,
      players: game.getPlayerCount(),
      maxPlayers: game.maxPlayers,
    }));
  }

  // Get all games a player is in
  getGamesWithPlayer(playerId: string): TexasHoldemGame[] {
    return Array.from(this.games.values()).filter(game =>
      game.seats.some(seat => seat.player?.id === playerId)
    );
  }
}

export const gameManager = new GameManager();
