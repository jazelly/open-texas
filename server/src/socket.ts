import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { TexasHoldemGame, Card } from "./models/TexasHoldemGame.js";
import { gameManager } from "./services/GameManager.js";
import { userService } from "./services/UserService.js";
import { gameService } from "./services/GameService.js";
import { Seat } from "./models/Seat.js";
import { userGameSessionService } from "./services/UserGameSessionService.js";

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

interface SitDownInfo {
  gameId: string;
  position: number;
}

interface PlayerActionInfo {
  gameId: string;
  action: string;
  amount?: number;
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
  io.on("connection", (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join waiting room of a game
    socket.on(
      "joinWaitingRoom",
      async ({ gameId, playerName, token }: JoinGameInfo) => {
        console.log("joinWaitingRoom", gameId, playerName, token);
        try {
          const game = await gameService.getGameById(gameId);
          if (!gameManager.getGame(gameId)) {
            socket.emit("error", { message: "Game not found" });
            return;
          }

          if (!game) {
            socket.emit("error", { message: "Game not found" });
            return;
          }

          const user = await userService.getUserByName(playerName);

          // Add player to waiting room in database
          await gameService.addPlayerToWaitingRoom(gameId, user.id);

          let validSession = false;
          if (token) {
            const session = await userGameSessionService.getSessionByToken(
              token
            );
            if (
              session &&
              session.gameId === gameId &&
              session.userId === user.id
            ) {
              validSession = true;
              // Update socket ID and socket reference in session
              await userGameSessionService.updateSessionActivity(
                token,
                socket.id
              );
            }
          }

          if (!validSession) {
            const token = await userGameSessionService.createSession(
              user.id,
              gameId,
              socket.id
            );
            socket.emit("sessionCreated", token);
          }

          socket.join(gameId);

          const gameState = gameManager.getGame(gameId)?.getState();
          console.log("gameState", gameState);
          if (gameState) {
            io.to(gameId).emit("gameState", gameState);
          }
        } catch (error) {
          console.error("Error joining waiting room:", error);
          socket.emit("error", { message: "Failed to join waiting room" });
        }
      }
    );

    // Sit down at a specific position
    socket.on("sitDown", async ({ gameId, position }: SitDownInfo) => {
      try {
        const game = gameManager.getGame(gameId);

        if (game) {
          // Find the player's session
          let playerSessionToken = "";
          let userId = "";

          const sessions = await userGameSessionService.getSessions();
          for (const session of sessions) {
            if (session.gameId === gameId) {
              playerSessionToken = session.token;
              userId = session.userId || "";
              break;
            }
          }

          if (userId) {
            const user = await userService.getUserById(userId);
            // Check if position is valid and available
            if (
              position >= 0 &&
              position < game.maxPlayers &&
              !game.seats[position].player
            ) {
              await gameService.movePlayerToGame(gameId, userId, position);

              // Remove player from waiting room
              gameManager.removePlayerFromWaitingRoom(gameId, user.name);

              // Send updated game state to all players
              const gameState = game.getState();
              io.to(gameId).emit("gameState", gameState);
            } else {
              socket.emit("error", { message: "Seat not available" });
            }
          } else {
            socket.emit("error", { message: "Player not found" });
          }
        } else {
          socket.emit("error", { message: "Game not found" });
        }
      } catch (error) {
        console.error("Error sitting down:", error);
        socket.emit("error", { message: "Failed to sit down" });
      }
    });

    // Leave a game
    socket.on("leaveGame", async ({ gameId }: { gameId: string }) => {
      try {
        const game = gameManager.getGame(gameId);

        if (!game) return;

        // Find player name and user ID
        let playerName = "";
        let userId = "";

        const sessions = await userGameSessionService.getSessions();
        for (const session of sessions) {
          if (session.gameId === gameId) {
            const user = await userService.getUserById(session.userId);
            playerName = user.name;
            userId = session.userId || "";
            break;
          }
        }

        if (userId) {
          // Check if player is active in the game
          const isActivePlayer = game.seats.some(
            (seat) => seat.player && seat.player.name === playerName
          );

          // Remove player from database (either active or waiting)
          await gameService.removePlayerFromGame(
            gameId,
            userId,
            isActivePlayer
          );

          // Remove player from the game
          game.removePlayer(socket.id);

          const waitingPlayers = gameManager.getWaitingPlayers(gameId);

          gameManager.removePlayerFromWaitingRoom(gameId, playerName);

          // Leave the game room
          socket.leave(gameId);

          if (game.isEmpty()) {
            // Remove empty games with no waiting players
            console.log("removing game", gameId);
            gameManager.removeGame(gameId);
            waitingPlayers.delete(gameId);

            // Update game status in database to inactive
            await gameService.updateGameStatus(gameId, false);

            // Clean up sessions for this game
            for (const session of sessions) {
              if (session.gameId === game.id) {
                await userGameSessionService.deleteSession(session.token);
              }
            }
          } else {
            // Update game state for remaining players
            const gameState = game.getState();
            io.to(gameId).emit("gameState", gameState);

            // Update game history in database
            await gameService.updateGameHistory(gameId, gameState);
          }
        }
      } catch (error) {
        console.error("Error leaving game:", error);
        socket.emit("error", { message: "Failed to leave game" });
      }
    });

    // Start the game
    socket.on("startGame", async ({ gameId }: { gameId: string }) => {
      try {
        const game = gameManager.getGame(gameId);

        if (game && game.canStart()) {
          game.start();
          const gameState = game.getState();
          io.to(gameId).emit("gameState", gameState);

          // Update game history in database
          await gameService.updateGameHistory(gameId, gameState);
        } else {
          socket.emit("error", { message: "Unable to start game" });
        }
      } catch (error) {
        console.error("Error starting game:", error);
        socket.emit("error", { message: "Failed to start game" });
      }
    });

    // Handle player actions (fold, check, call, bet, raise, all-in)
    socket.on(
      "playerAction",
      async ({ gameId, action, amount }: PlayerActionInfo) => {
        try {
          const game = gameManager.getGame(gameId);

          if (game) {
            game.handlePlayerAction(socket.id, action, amount);

            // Send updated game state to all players
            const gameState = game.getState();
            io.to(gameId).emit("gameState", gameState);

            // Update game history in database
            await gameService.updateGameHistory(gameId, gameState);

            // Check if game phase is over
            if (game.isHandComplete()) {
              // Update user chips in database for all players
              for (const seat of game.seats) {
                if (seat.player) {
                  // Find user ID for this player
                  let userId = "";
                  const sessions = await userGameSessionService.getSessions();
                  for (const session of sessions) {
                    if (
                      session.userId === seat.player.id &&
                      session.gameId === gameId
                    ) {
                      userId = session.userId || "";
                      break;
                    }
                  }

                  if (userId) {
                    // Update user chips in database
                    await userService.updateUserChips(
                      userId,
                      seat.player.chips
                    );
                  }
                }
              }

              // If the game is over, notify players
              if (game.isGameOver()) {
                io.to(gameId).emit("gameEnded");

                // Update game status in database to inactive
                await gameService.updateGameStatus(gameId, false);

                // Clean up sessions and waiting players for this game
                const sessions = await userGameSessionService.getSessions();
                for (const session of sessions) {
                  if (session.gameId === gameId) {
                    await userGameSessionService.deleteSession(session.token);
                  }
                }

                gameManager.removePlayersFromWaitingRoom(gameId);
                gameManager.removeGame(gameId);
              }
            }
          } else {
            socket.emit("error", { message: "Game not found" });
          }
        } catch (error) {
          console.error("Error processing player action:", error);
          socket.emit("error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    // Handle disconnection
    // sometimes disconnect does not mean we need to immediately remove a game
    socket.on("disconnect", async () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Find player information
      let playerName = "";
      let gameId = "";
      let sessionToken = "";
      let userId = "";
      const sessions = await userGameSessionService.getSessions();
      for (const session of sessions) {
        if (session.socketId === socket.id) {
          const user = await userService.getUserById(session.userId);
          playerName = user.name;
          gameId = session.gameId;
          sessionToken = session.token;
          userId = session.userId || "";
          break;
        }
      }

      if (gameId) {
        try {
          const game = gameManager.getGame(gameId);

          if (game) {
            // Remove from waiting room if they're in it
            gameManager.removePlayerFromWaitingRoom(gameId, playerName);
            game.markPlayerInactive(socket.id);

            // Update game state for remaining players
            const gameState = game.getState();
            io.to(gameId).emit("gameState", gameState);

            // Update game history in database
            await gameService.updateGameHistory(gameId, gameState);
          }
        } catch (error) {
          console.error("Error handling disconnect:", error);
        }
      }
    });
  });
};
