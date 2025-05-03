import { Request, Response } from 'express';
import { gameService } from '../services/GameService';

/**
 * Get all games
 */
export const getAllGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const games = await gameService.getAllGames();
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
};

/**
 * Get active games
 */
export const getActiveGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const games = await gameService.getActiveGames();
    res.json(games);
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({ error: 'Failed to fetch active games' });
  }
};

/**
 * Get a game by ID
 */
export const getGameById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const game = await gameService.getGameById(id);
    
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
};

/**
 * Create a new game
 */
export const createGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, maxPlayers = 6, creatorId } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Game name is required' });
      return;
    }
    
    if (!creatorId) {
      res.status(400).json({ error: 'Creator ID is required' });
      return;
    }
    
    const game = await gameService.createGame(name, maxPlayers, creatorId);
    
    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

/**
 * Add a player to a game's waiting room
 */
export const addPlayerToWaitingRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, userId } = req.body;
    
    if (!gameId || !userId) {
      res.status(400).json({ error: 'Game ID and User ID are required' });
      return;
    }
    
    // Check if game exists
    const game = await gameService.getGameById(gameId);
    
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    const updatedGame = await gameService.addPlayerToWaitingRoom(gameId, userId);
    
    res.json(updatedGame);
  } catch (error) {
    console.error('Error adding player to waiting room:', error);
    res.status(500).json({ error: 'Failed to add player to waiting room' });
  }
};

/**
 * Add a player to the game (from waiting room to active player)
 */
export const addPlayerToGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, userId, position } = req.body;
    
    if (!gameId || !userId) {
      res.status(400).json({ error: 'Game ID and User ID are required' });
      return;
    }
    
    // Get the game
    const game = await gameService.getGameById(gameId);
    
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    // Check if the game is full
    if (game.players.length >= game.maxPlayers) {
      res.status(400).json({ error: 'Game is full' });
      return;
    }
    
    // Check if the user is in the waiting room
    const isUserWaiting = game.waitingPlayers.some((player: { id: string }) => player.id === userId);
    
    if (!isUserWaiting) {
      res.status(400).json({ error: 'User is not in the waiting room' });
      return;
    }
    
    // Check if the position is already occupied if a position is specified
    if (position !== undefined) {
      const isPositionOccupied = game.players.some((player: { position: number }) => player.position === position);
      if (isPositionOccupied) {
        res.status(400).json({ error: 'Position already occupied' });
        return;
      }
    }
    
    // Move user from waiting room to active players
    const updatedGame = await gameService.movePlayerToGame(gameId, userId, position);
    
    res.json(updatedGame);
  } catch (error) {
    console.error('Error adding player to game:', error);
    res.status(500).json({ error: 'Failed to add player to game' });
  }
};

/**
 * Remove a player from the game
 */
export const removePlayerFromGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, userId } = req.body;
    
    if (!gameId || !userId) {
      res.status(400).json({ error: 'Game ID and User ID are required' });
      return;
    }
    
    // Check if the player is in the game
    const game = await gameService.getGameById(gameId);
    
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    // Check if player is in active players or waiting room
    const isActivePlayer = game.players.some((player: { id: string }) => player.id === userId);
    const isWaitingPlayer = game.waitingPlayers.some((player: { id: string }) => player.id === userId);
    
    if (!isActivePlayer && !isWaitingPlayer) {
      res.status(404).json({ error: 'Player not found in this game' });
      return;
    }
    
    // Remove the player
    await gameService.removePlayerFromGame(gameId, userId, isActivePlayer);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing player from game:', error);
    res.status(500).json({ error: 'Failed to remove player from game' });
  }
};

/**
 * Update a game's status (active/inactive)
 */
export const updateGameStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    if (isActive === undefined) {
      res.status(400).json({ error: 'isActive status is required' });
      return;
    }
    
    const game = await gameService.updateGameStatus(id, Boolean(isActive));
    
    res.json(game);
  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({ error: 'Failed to update game status' });
  }
};

/**
 * Update game history
 */
export const updateGameHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { historyEntry } = req.body;
    
    if (!historyEntry) {
      res.status(400).json({ error: 'History entry is required' });
      return;
    }
    
    // Get the current game
    const game = await gameService.getGameById(id);
    
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    // Update game history
    const updatedGame = await gameService.updateGameHistory(id, historyEntry);
    
    res.json(updatedGame);
  } catch (error) {
    console.error('Error updating game history:', error);
    res.status(500).json({ error: 'Failed to update game history' });
  }
};

/**
 * Delete a game
 */
export const deleteGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await gameService.deleteGame(id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
}; 