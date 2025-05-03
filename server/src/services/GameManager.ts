import { TexasHoldemGame } from '../models/TexasHoldemGame';

export class GameManager {
  private games: Map<string, TexasHoldemGame>;
  private playerGameMap: Map<string, Set<string>>;

  constructor() {
    this.games = new Map();
    this.playerGameMap = new Map();
  }

  // Add a new game to the manager
  addGame(game: TexasHoldemGame): void {
    this.games.set(game.id, game);
  }

  // Remove a game from the manager
  removeGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (game) {
      // Remove player-game mappings for all players in this game
      game.seats.forEach(seat => {
        if (seat.player) {
          this.removePlayerFromGame(seat.player.id, gameId);
        }
      });
      this.games.delete(gameId);
    }
  }

  // Get a game by ID
  getGame(gameId: string): TexasHoldemGame | undefined {
    return this.games.get(gameId);
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

  // Add a player to a game
  addPlayerToGame(playerId: string, gameId: string): void {
    if (!this.playerGameMap.has(playerId)) {
      this.playerGameMap.set(playerId, new Set());
    }
    this.playerGameMap.get(playerId)?.add(gameId);
  }

  // Remove a player from a game
  removePlayerFromGame(playerId: string, gameId: string): void {
    const playerGames = this.playerGameMap.get(playerId);
    if (playerGames) {
      playerGames.delete(gameId);
      if (playerGames.size === 0) {
        this.playerGameMap.delete(playerId);
      }
    }
  }

  // Get all games a player is in
  getGamesWithPlayer(playerId: string): TexasHoldemGame[] {
    const gameIds = this.playerGameMap.get(playerId);
    if (!gameIds) return [];
    
    return Array.from(gameIds)
      .map(gameId => this.games.get(gameId))
      .filter(game => game !== undefined) as TexasHoldemGame[];
  }
} 