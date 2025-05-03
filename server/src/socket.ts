import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { TexasHoldemGame, Card } from './models/TexasHoldemGame';
import { GameManager } from './services/GameManager';
import { userService } from './services/UserService';
import { gameService } from './services/GameService';

// Initialize game manager
const gameManager = new GameManager();

// Session management
interface Session {
  token: string;
  socketId: string;
  playerName: string;
  gameId: string;
  createdAt: number;
  socket: Socket;
  userId?: string; // Add userId to link with database user
}

// Store active sessions
export const sessions = new Map<string, Session>();

// Store waiting players for each game
export const waitingPlayers = new Map<string, Set<string>>();

// Clean up expired sessions periodically (30 min expiration)
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_EXPIRY) {
      sessions.delete(token);
    }
  }
}, 60000); // Check every minute

interface PlayerInfo {
  playerName: string;
}

interface GameInfo {
  name: string;
  maxPlayers: number;
  playerName: string;
}

interface JoinGameInfo {
  gameId: string;
  playerName: string;
  token?: string;
}

interface SitDownInfo {
  gameId: string;
  position: number;
}

interface PlayerActionInfo {
  gameId: string;
  action: string;
  amount?: number;
}

// Define a complete game state interface that includes waiting players
interface GameStateWithWaiting {
  id: string;
  players: {
    id: string;
    name: string;
    chips: number;
    cards: Card[];
    isActive: boolean;
    isTurn: boolean;
    isDealer: boolean;
    isFolded: boolean;
    isAllIn: boolean;
    currentBet: number;
    position: number;
  }[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  phase: string;
  winners: { playerId: string; name: string; handDescription: string }[];
  maxPlayers: number;
  waitingPlayers?: string[];
}

export const calculateSeatPosition = (seatIndex: number, maxSeats: number): { top: number, left: number } => {
  const angle = (2 * Math.PI * seatIndex) / maxSeats;
  const radius = 40; // % of the table
  const top = 50 - radius * Math.cos(angle);
  const left = 50 + radius * Math.sin(angle);
  return { top, left };
}

export const gameSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join lobby
    socket.on('joinLobby', async ({ playerName }: PlayerInfo) => {
      try {
        // Find or create user in the database
        const user = await userService.findOrCreateUser(playerName);
        
        // Get active games from database
        const activeGames = await gameService.getActiveGames();
        
        // Transform database games to format expected by client
        const gamesList = activeGames.map(game => ({
          id: game.id,
          name: game.name,
          players: game.players.length,
          maxPlayers: game.maxPlayers
        }));
        
        // Send current games list to the user
        socket.emit('gamesList', gamesList);
      } catch (error) {
        console.error('Error in joinLobby:', error);
        socket.emit('error', { message: 'Failed to join lobby' });
      }
    });

    // Create a new game
    socket.on('createGame', async ({ name, maxPlayers, playerName }: GameInfo) => {
      try {
        // Find or create user in database
        const user = await userService.findOrCreateUser(playerName);
        
        // Create new game in database
        const dbGame = await gameService.createGame(name, maxPlayers, user.id);
        const gameId = dbGame.id;
        
        // Create in-memory game object
        const seatCoordinates = [];
        for (let i = 0; i < maxPlayers; i++) {
          seatCoordinates.push(calculateSeatPosition(i, maxPlayers));
        }
        const game = new TexasHoldemGame(gameId, name, seatCoordinates, maxPlayers);
        gameManager.addGame(game);
        
        // Create a waiting room for this game
        waitingPlayers.set(gameId, new Set([playerName]));
        
        // Create a session token for this player
        const token = uuidv4();
        sessions.set(token, {
          token,
          socketId: socket.id,
          playerName,
          gameId,
          createdAt: Date.now(),
          socket,
          userId: user.id
        });
        game.socketMap.set(token, socket);
        
        // Join socket room for this game
        socket.join(gameId);
        
        // Notify player they've created and joined the game
        socket.emit('gameCreated', { id: gameId });
        
        // Send session token to client
        socket.emit('sessionCreated', { token });
        
        // Send initial game state with waiting players
        const gameState = game.getState() as GameStateWithWaiting;
        gameState.waitingPlayers = Array.from(waitingPlayers.get(gameId) || []);
        io.to(gameId).emit('gameState', gameState);
      } catch (error) {
        console.error('Error creating game:', error);
        socket.emit('error', { message: 'Failed to create game' });
      }
    });

    // Join waiting room of a game
    socket.on('joinWaitingRoom', async ({ gameId, playerName, token }: JoinGameInfo) => {
      try {
        const game = gameManager.getGame(gameId);
        
        if (game) {
          // Find or create user in database
          const user = await userService.findOrCreateUser(playerName);
          
          // Add player to waiting room in database
          await gameService.addPlayerToWaitingRoom(gameId, user.id);
          
          // Check if a valid session token is provided
          let validSession = false;
          
          if (token) {
            const session = sessions.get(token);
            if (session && session.gameId === gameId && session.playerName === playerName) {
              validSession = true;
              // Update socket ID and socket reference in session
              session.socketId = socket.id;
              session.socket = socket;
              session.userId = user.id;
              game.socketMap.set(token, socket);
            }
          }
          
          if (!validSession) {
            // Create a new session for this player
            const newToken = uuidv4();
            sessions.set(newToken, {
              token: newToken,
              socketId: socket.id,
              playerName,
              gameId,
              createdAt: Date.now(),
              socket,
              userId: user.id
            });
            game.socketMap.set(newToken, socket);
            
            // Send session token to client
            socket.emit('sessionCreated', { token: newToken });
          }
          
          // Join socket room for this game
          socket.join(gameId);
          
          // Add player to waiting room if not already seated
          const isPlayerSeated = game.seats.some(s => s.player?.name === playerName);
          if (!isPlayerSeated) {
            // Initialize waiting room for this game if it doesn't exist
            if (!waitingPlayers.has(gameId)) {
              waitingPlayers.set(gameId, new Set());
            }
            
            // Add player to waiting room
            waitingPlayers.get(gameId)?.add(playerName);
          }
          
          // Send current game state to the player
          const gameState = game.getState() as GameStateWithWaiting;
          gameState.waitingPlayers = Array.from(waitingPlayers.get(gameId) || []);
          io.to(gameId).emit('gameState', gameState);
        } else {
          // Game doesn't exist
          socket.emit('error', { message: 'Game not found' });
        }
      } catch (error) {
        console.error('Error joining waiting room:', error);
        socket.emit('error', { message: 'Failed to join waiting room' });
      }
    });

    // Sit down at a specific position
    socket.on('sitDown', async ({ gameId, position }: SitDownInfo) => {
      try {
        const game = gameManager.getGame(gameId);
        
        if (game) {
          // Find the player's session
          let playerName = '';
          let playerSessionToken = '';
          let userId = '';
          
          for (const [token, session] of sessions.entries()) {
            if (session.socketId === socket.id && session.gameId === gameId) {
              playerName = session.playerName;
              playerSessionToken = token;
              userId = session.userId || '';
              break;
            }
          }
          
          if (playerName && userId) {
            // Check if position is valid and available
            if (position >= 0 && position < game.maxPlayers && !game.seats[position].player) {
              // Add player to the game at the specified position
              game.addPlayerAtPosition(socket.id, playerName, 1000, position);
              
              // Update in database - move from waiting to active
              await gameService.movePlayerToGame(gameId, userId);
              
              // Remove player from waiting room
              waitingPlayers.get(gameId)?.delete(playerName);
              
              // Send updated game state to all players
              const gameState = game.getState() as GameStateWithWaiting;
              gameState.waitingPlayers = Array.from(waitingPlayers.get(gameId) || []);
              io.to(gameId).emit('gameState', gameState);
            } else {
              socket.emit('error', { message: 'Seat not available' });
            }
          } else {
            socket.emit('error', { message: 'Player not found' });
          }
        } else {
          socket.emit('error', { message: 'Game not found' });
        }
      } catch (error) {
        console.error('Error sitting down:', error);
        socket.emit('error', { message: 'Failed to sit down' });
      }
    });

    // Leave a game
    socket.on('leaveGame', async ({ gameId }: { gameId: string }) => {
      try {
        const game = gameManager.getGame(gameId);
        
        if (game) {
          // Find player name and user ID
          let playerName = '';
          let userId = '';
          
          for (const [token, session] of sessions.entries()) {
            if (session.socketId === socket.id && session.gameId === gameId) {
              playerName = session.playerName;
              userId = session.userId || '';
              sessions.delete(token);
              break;
            }
          }
          
          if (userId) {
            // Check if player is active in the game
            const isActivePlayer = game.seats.some(seat => 
              seat.player && seat.player.name === playerName);
            
            // Remove player from database (either active or waiting)
            await gameService.removePlayerFromGame(gameId, userId, isActivePlayer);
          }
          
          // Remove player from the game
          game.removePlayer(socket.id);
          
          // Remove player from waiting room if they're in it
          if (playerName && waitingPlayers.has(gameId)) {
            waitingPlayers.get(gameId)?.delete(playerName);
          }
          
          // Leave the game room
          socket.leave(gameId);
          
          if (game.isEmpty() && (!waitingPlayers.has(gameId) || waitingPlayers.get(gameId)?.size === 0)) {
            // Remove empty games with no waiting players
            gameManager.removeGame(gameId);
            waitingPlayers.delete(gameId);
            
            // Update game status in database to inactive
            await gameService.updateGameStatus(gameId, false);
            
            // Clean up sessions for this game
            for (const [token, session] of sessions.entries()) {
              if (session.gameId === game.id) {
                sessions.delete(token);
              }
            }
          } else {
            // Update game state for remaining players
            const gameState = game.getState() as GameStateWithWaiting;
            if (waitingPlayers.has(gameId)) {
              gameState.waitingPlayers = Array.from(waitingPlayers.get(gameId) || []);
            }
            io.to(gameId).emit('gameState', gameState);
            
            // Update game history in database
            await gameService.updateGameHistory(gameId, gameState);
          }
        }
      } catch (error) {
        console.error('Error leaving game:', error);
        socket.emit('error', { message: 'Failed to leave game' });
      }
    });

    // Start the game
    socket.on('startGame', async ({ gameId }: { gameId: string }) => {
      try {
        const game = gameManager.getGame(gameId);
        
        if (game && game.canStart()) {
          game.start();
          const gameState = game.getState() as GameStateWithWaiting;
          gameState.waitingPlayers = Array.from(waitingPlayers.get(gameId) || []);
          io.to(gameId).emit('gameState', gameState);
          
          // Update game history in database
          await gameService.updateGameHistory(gameId, gameState);
        } else {
          socket.emit('error', { message: 'Unable to start game' });
        }
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Handle player actions (fold, check, call, bet, raise, all-in)
    socket.on('playerAction', async ({ gameId, action, amount }: PlayerActionInfo) => {
      try {
        const game = gameManager.getGame(gameId);
        
        if (game) {
          game.handlePlayerAction(socket.id, action, amount);
          
          // Send updated game state to all players
          const gameState = game.getState() as GameStateWithWaiting;
          gameState.waitingPlayers = Array.from(waitingPlayers.get(gameId) || []);
          io.to(gameId).emit('gameState', gameState);
          
          // Update game history in database
          await gameService.updateGameHistory(gameId, gameState);
          
          // Check if game phase is over
          if (game.isHandComplete()) {
            // Update user chips in database for all players
            for (const seat of game.seats) {
              if (seat.player) {
                // Find user ID for this player
                let userId = '';
                for (const [_, session] of sessions.entries()) {
                  if (session.playerName === seat.player.name && session.gameId === gameId) {
                    userId = session.userId || '';
                    break;
                  }
                }
                
                if (userId) {
                  // Update user chips in database
                  await userService.updateUserChips(userId, seat.player.chips);
                }
              }
            }
            
            // If the game is over, notify players
            if (game.isGameOver()) {
              io.to(gameId).emit('gameEnded');
              
              // Update game status in database to inactive
              await gameService.updateGameStatus(gameId, false);
              
              // Clean up sessions and waiting players for this game
              for (const [token, session] of sessions.entries()) {
                if (session.gameId === gameId) {
                  sessions.delete(token);
                }
              }
              
              waitingPlayers.delete(gameId);
              gameManager.removeGame(gameId);
            }
          }
        } else {
          socket.emit('error', { message: 'Game not found' });
        }
      } catch (error) {
        console.error('Error processing player action:', error);
        socket.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Find player information
      let playerName = '';
      let gameId = '';
      let sessionToken = '';
      let userId = '';
      
      for (const [token, session] of sessions.entries()) {
        if (session.socketId === socket.id) {
          playerName = session.playerName;
          gameId = session.gameId;
          sessionToken = token;
          userId = session.userId || '';
          break;
        }
      }
      
      if (gameId) {
        try {
          const game = gameManager.getGame(gameId);
          
          if (game) {
            // Mark player as inactive but don't remove immediately
            game.markPlayerInactive(socket.id);
            
            // Remove from waiting room if they're in it
            if (playerName && waitingPlayers.has(gameId)) {
              waitingPlayers.get(gameId)?.delete(playerName);
            }
            
            if (game.isEmpty() && (!waitingPlayers.has(gameId) || waitingPlayers.get(gameId)?.size === 0)) {
              // Remove empty games with no waiting players
              gameManager.removeGame(gameId);
              waitingPlayers.delete(gameId);
              
              // Update game status in database to inactive
              await gameService.updateGameStatus(gameId, false);
              
              // Clean up sessions for this game
              for (const [token, session] of sessions.entries()) {
                if (session.gameId === gameId) {
                  sessions.delete(token);
                }
              }
            } else {
              // Update game state for remaining players
              const gameState = game.getState() as GameStateWithWaiting;
              if (waitingPlayers.has(gameId)) {
                gameState.waitingPlayers = Array.from(waitingPlayers.get(gameId) || []);
              }
              io.to(gameId).emit('gameState', gameState);
              
              // Update game history in database
              await gameService.updateGameHistory(gameId, gameState);
            }
            
            // Don't remove the session immediately, allow for reconnection
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      }
    });
  });
}; 