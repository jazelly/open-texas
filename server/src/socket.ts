import { Server, Socket } from 'socket.io';
import { gameManager } from './services/GameManager.js';
import { userService } from './services/UserService.js';
import { gameService } from './services/GameService.js';
import { userGameSessionService } from './services/UserGameSessionService.js';
import { Action } from './models/Round.js';

// Clean up expired sessions periodically (30 min expiration)
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
setInterval(async () => {
  const now = Date.now();
  const sessions = await userGameSessionService.getSessions();
  for (const session of sessions) {
    if (now - SESSION_EXPIRY > session.updatedAt.getTime()) {
      userGameSessionService.deleteSession(session.token);
    }
  }
}, 60000); // Check every minute

interface JoinGameInfo {
  gameId: string;
  playerName: string;
  token?: string;
}

interface RefreshSessionInfo {
  gameId: string;
  playerName: string;
  token?: string;
}

interface SitDownInfo {
  gameId: string;
  position: number;
  token?: string;
}

interface PlayerActionInfo {
  gameId: string;
  action: string;
  amount?: number;
  token?: string;
}

export const calculateSeatPosition = (
  seatIndex: number,
  maxSeats: number
): { top: number; left: number } => {
  const angle = (2 * Math.PI * seatIndex) / maxSeats;
  const radius = 40; // % of the table
  const top = 50 - radius * Math.cos(angle);
  const left = 50 + radius * Math.sin(angle);
  return { top, left };
};

// cleanup inactive games
setInterval(async () => {
  const games = await gameService.getAllGames();
  for (const game of games) {
    // aged for 10 minutes without activity
    if (game.updatedAt < Date.now() - 60000 * 10) {
      await gameService.deleteGame(game.id);
    }
  }
}, 60000);

export const gameSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join waiting room of a game
    socket.on('joinWaitingRoom', async ({ gameId, playerName, token }: JoinGameInfo) => {
      console.log('joinWaitingRoom', gameId, playerName, token);
      try {
        const dbGame = await gameService.getGameById(gameId);
        const game = gameManager.getGame(gameId);
        if (!game || !dbGame) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const user = await userService.getUserByName(playerName);
        
        let validSession = false;
        do {
          if (!token) break;
          const decodedToken = userGameSessionService.verifySessionToken(token);
          if (!decodedToken) break;
          const playerSeat = game.seats.find(s => s.player?.id === user.id);
          // TODO: shouldn't happen and error should be thrown
          if (!playerSeat) break;

          // Having token and joining a game means the user was not properly exited
          if (
            decodedToken.gameId === gameId &&
            decodedToken.userId === user.id
          ) {
            validSession = true;
            // Update socket ID and session activity
            await userGameSessionService.updateSessionActivity(token, socket.id);
          } else {
            // not joining the same game
            await userGameSessionService.deleteSession(token);
          }
          
        } while(0);

        if (!validSession) {
          await gameService.addPlayerToWaitingRoom(gameId, user.id);
          const sessionData = await userGameSessionService.createSession(
            user.id,
            gameId,
            socket.id
          );
          socket.emit('sessionCreated', sessionData);
        }

        socket.join(gameId);

        const gameState = gameManager.getGame(gameId)?.getState();
        if (gameState) {
          io.to(gameId).emit('gameState', gameState);
        }
      } catch (error) {
        console.error('Error joining waiting room:', error);
        socket.emit('error', { message: 'Failed to join waiting room' });
      }
    });

    // Handle token refresh requests
    socket.on('refreshSession', async ({ gameId, playerName, token }: RefreshSessionInfo) => {
      try {
        if (!token) {
          socket.emit('error', { message: 'No token provided for refresh' });
          return;
        }

        // Verify the current token
        const decodedToken = userGameSessionService.verifySessionToken(token);
        if (!decodedToken) {
          socket.emit('sessionInvalid');
          return;
        }

        // Refresh the token
        const refreshedToken = await userGameSessionService.refreshSessionToken(token);

        if (refreshedToken) {
          socket.emit('sessionRefresh', refreshedToken);
        } else {
          socket.emit('sessionInvalid');
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
        socket.emit('error', { message: 'Failed to refresh session' });
      }
    });

    // Sit down at a specific position
    socket.on('sitDown', async ({ gameId, position, token }: SitDownInfo) => {
      try {
        const game = gameManager.getGame(gameId);

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        if (!token) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Verify the token
        const decodedToken = userGameSessionService.verifySessionToken(token);
        if (!decodedToken || decodedToken.gameId !== gameId) {
          socket.emit('error', { message: 'Invalid token' });
          return;
        }

        // Get user from token
        const userId = decodedToken.userId;
        const user = await userService.getUserById(userId);

        if (!user) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }

        // Check if position is valid and available
        if (position >= 0 && position < game.maxPlayers && !game.seats[position].player) {
          await gameService.movePlayerToGame(gameId, userId, position);

          // Send updated game state to all players
          const gameState = game.getState();
          io.to(gameId).emit('gameState', gameState);
        } else {
          socket.emit('error', { message: 'Seat not available' });
        }
      } catch (error) {
        console.error('Error sitting down:', error);
        socket.emit('error', { message: 'Failed to sit down' });
      }
    });

    // Leave a game
    socket.on('leaveGame', async ({ gameId, token }: { gameId: string; token?: string }) => {
      try {
        const game = gameManager.getGame(gameId);
        if (!game) throw new Error('Game not found while leaving');

        if (!token) {
          // Even without token, we'll allow leaving
          // but this shouldn't happen
          console.log('Player leaving without token');
        } else {
          // Verify the token
          const decodedToken = userGameSessionService.verifySessionToken(token);
          if (decodedToken) {
            // Get user from token
            const userId = decodedToken.userId;
            const user = await userService.getUserById(userId);

            if (user) {
              // Check if player is active in the game
              const isActivePlayer = game.seats.some(
                seat => seat.player && seat.player.name === user.name
              );

              // Remove player from database (either active or waiting)
              await gameService.removePlayerFromGame(gameId, userId, isActivePlayer);

              // Remove player from the game
              game.removePlayer(socket.id);
              gameManager.removePlayerFromWaitingRoom(gameId, user.name);

              // Clean up session
              const session = await userGameSessionService.getSessionByToken(token);
              if (session) {
                await userGameSessionService.deleteSession(token);
              }
            }
          }
        }

        // Leave the game room
        socket.leave(gameId);
        if (game.isEmpty()) {
          // Remove empty games with no waiting players
          console.log('removing game', gameId);
          gameManager.removeGame(gameId);
          await gameService.deleteGame(gameId);
          await userGameSessionService.deleteGameSessions(gameId);
        } else {
          // Update game state for remaining players
          const gameState = game.getState();
          io.to(gameId).emit('gameState', gameState);

          // Update game history in database
          await gameService.updateGameHistory(gameId, gameState);
        }
      } catch (error) {
        console.error('Error leaving game:', error);
        socket.emit('error', { message: 'Failed to leave game' });
      }
    });

    // Handle player actions
    socket.on('playerAction', async ({ gameId, action, amount, token }: PlayerActionInfo) => {
      try {
        const game = gameManager.getGame(gameId);

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (!token) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Verify the token
        const decodedToken = userGameSessionService.verifySessionToken(token);
        if (!decodedToken || decodedToken.gameId !== gameId) {
          socket.emit('sessionInvalid');
          return;
        }

        // Get user from token and update socket.id mapping if needed
        const userId = decodedToken.userId;
        const user = await userService.getUserById(userId);

        if (!user) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }

        const nextSeat = game.handlePlayerAction(userId, action as Action, amount);

        // Send updated game state to all players
        const gameState = game.getState();
        io.to(gameId).emit('gameState', gameState);

        // Update game history in database
        await gameService.updateGameHistory(gameId, gameState);
      } catch (error) {
        console.error('Error handling player action:', error);
        socket.emit('error', { message: 'Failed to process action' });
      }
    });

    // Start the game
    socket.on('startGame', async ({ gameId, token }: { gameId: string; token?: string }) => {
      try {
        const game = gameManager.getGame(gameId);

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (!token) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Verify the token
        const decodedToken = userGameSessionService.verifySessionToken(token);
        if (!decodedToken || decodedToken.gameId !== gameId) {
          socket.emit('error', { message: 'Invalid token' });
          return;
        }

        if (game.canStart()) {
          game.start();
          const gameState = game.getState();
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

    // Handle disconnection
    // sometimes disconnect does not mean we need to immediately remove a game
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);

      try {
        // Find session by socket ID
        const sessions = await userGameSessionService.getSessionsBySocketId(socket.id);

        if (sessions.length === 0) {
          throw new Error(`Session already disconnected: ${socket.id}`);
        }
        if (sessions.length > 1) {
          throw new Error(`Multiple sessions found for socket ID: ${socket.id}`);
        }

        const session = sessions[0];
        const gameId = session.gameId;
        const game = gameManager.getGame(gameId);
        if (!game) throw new Error(`Game cleaned but still in a session: ${gameId}`);

        // Get user details
        const user = await userService.getUserById(session.userId);
        if (!user) throw new Error(`User not found: ${session.userId}`);

        game.tryMarkingPlayingPlayerToBeRemoved(user.id);
        gameManager.removePlayerFromWaitingRoom(gameId, user.name);

        // Update game state for remaining players
        const gameState = game.getState();
        io.to(gameId).emit('gameState', gameState);

        // Update game history in database
        await gameService.updateGameHistory(gameId, gameState);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};
