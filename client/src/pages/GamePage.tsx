import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io, { Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

// Components
import Card from "../components/Card";
import Player from "../components/Player";
import EmptySeat from "../components/EmptySeat";
import { calculateSeatPosition } from "../utils/tableUtils";

// Constants
const MAX_SEATS = 9; // Maximum number of seats at the table

interface Card {
  suit: string;
  value: string;
}

interface Player {
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
  position: number; // Server-assigned position
}

interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  phase: "pre-flop" | "flop" | "turn" | "river" | "showdown" | "waiting";
  winners: { playerId: string; name: string; handDescription: string }[];
  maxPlayers: number;
  waitingPlayers?: string[]; // Players in the waiting room
}

interface GameSession {
  gameId: string;
  playerName: string;
  token: string;
}

function GamePage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error, clearError } = useAuth();
  const storedSession = localStorage.getItem("gameSession");
  const [playerName, setPlayerName] = useState<string>(
    user?.name ||
    location.state?.playerName ||
    (storedSession ? JSON.parse(storedSession).playerName : "Anonymous")
  );
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const joinedGame = useRef(false);
  const [sessionToken, setSessionToken] = useState<string | null>(
    storedSession ? JSON.parse(storedSession).token : null
  );
  const [isSeated, setIsSeated] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(true);

  const isCreator = !!location.state?.isCreator;

  // Handle authentication status changes
  useEffect(() => {
    // If we're not loading and either not authenticated or have auth errors,
    // redirect to home page (but only if we don't have a playerName from location state)
    if (!isLoading && (!isAuthenticated || error) && !location.state?.playerName) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, error, navigate, location.state]);

  // Clear errors when unmounting
  useEffect(() => {
    return () => {
      if (error) clearError();
    };
  }, [error, clearError]);

  // Socket connection - updated to handle both direct and proxied connections
  useEffect(() => {
    if (isLoading || !gameId) return; // Wait until auth check completes
    if (socket) return;
    
    setConnecting(true);
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';
    
    let newSocket;
    if (socketUrl.startsWith('http') || socketUrl.startsWith('ws')) {
      // Direct connection to the socket server (needs CORS enabled on server)
      newSocket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
    } else {
      // Using the Vite proxy (relative URL - no CORS issues)
      newSocket = io({
        path: '/socket.io',
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
    }
    
    setSocket(newSocket);

    // Connection established handler
    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      // Don't set connecting to false here yet, wait for gameState
      // to ensure we have all necessary data
    });

    // Connection error handling
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setConnecting(false);
      // Display an error message to the user
      alert(`Failed to connect to game server: ${err.message}`);
    });

    const handleBeforeUnload = () => {
      if (gameId) {
        newSocket.emit("leaveGame", { gameId });
      }
    };

    // Add event listener for when user closes the window
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up function
    return () => {
      if (gameId) {
        newSocket.emit("leaveGame", { gameId });
        newSocket.disconnect();
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [gameId, isLoading, connecting]);

  useEffect(() => {
    if (!socket) return;
    
    // Check if we have a valid session for this game
    const storedSession = localStorage.getItem("gameSession");
    let validSession = false;

    if (storedSession) {
      const session: GameSession = JSON.parse(storedSession);
      // Verify session is for the current game
      if (session.gameId === gameId) {
        validSession = true;
        setSessionToken(session.token);
        setPlayerName(session.playerName);
      } else {
        // Clear session if it's for a different game
        localStorage.removeItem("gameSession");
      }
    }

    if (socket && gameId) {
      if (!joinedGame.current) {
        // Handle creating a new game
        if (gameId === 'new' && location.state?.isCreator) {
          socket.emit('createGame', {
            name: location.state.gameName,
            maxPlayers: location.state.maxPlayers || 6,
            playerName
          });
        }
        // Only join waiting room, don't join game yet
        else if (validSession && sessionToken) {
          socket.emit("joinWaitingRoom", {
            gameId,
            playerName,
            token: sessionToken,
          });
        } else {
          socket.emit("joinWaitingRoom", { gameId, playerName });
        }
        joinedGame.current = true;
      }

      socket.on("playerActionFinished", (state) => {
        setGameState({
          ...gameState,
          pot: state.pot,
          currentBet: state.currentBet,
        });
      });

      socket.on("gameState", (state: GameState) => {
        // Set connecting to false once we receive the game state
        if (connecting) {
          setConnecting(false);
          console.log('Game state received, connection complete');
        }
        
        setGameState(state);
        
        // Check if we're seated at the table
        const isPlayerSeated = state.players.some(p => p.name === playerName);
        setIsSeated(isPlayerSeated);
        
        if (isPlayerSeated) {
          setCurrentPlayer(
            state.players.find((p) => p.name === playerName) || null
          );
        } else {
          setCurrentPlayer(null);
        }

        // Set default bet amount to current bet or minimum raise
        if (state.currentBet > 0) {
          setBetAmount(state.currentBet * 2);
        } else {
          setBetAmount(10); // Minimum bet
        }
      });

      socket.on("gameCreated", (game: { id: string }) => {
        if (gameId === 'new') {
          // Update URL without reloading the page
          navigate(`/game/${game.id}`, { 
            state: { playerName },
            replace: true 
          });
        }
      });

      socket.on("gameEnded", () => {
        exitGame();
        setTimeout(() => {
          navigate("/lobby", { state: { playerName } });
        }, 2000);
      });

      socket.on("sessionCreated", (data: { token: string }) => {
        setSessionToken(data.token);
        // Save session info to localStorage
        const sessionData: GameSession = {
          gameId: gameId === 'new' ? '' : gameId,
          playerName,
          token: data.token,
        };
        localStorage.setItem("gameSession", JSON.stringify(sessionData));
      });

      socket.on("sessionInvalid", () => {
        // Session rejected, remove from localStorage
        localStorage.removeItem("gameSession");
        setSessionToken(null);
      });

      // Socket connection event handlers
      socket.on("connect", () => {
        console.log("Connected to the game server");
      });

      socket.on("disconnect", (reason) => {
        console.log(`Disconnected from game server: ${reason}`);
        if (reason === "io server disconnect" || reason === "io client disconnect") {
          // The disconnection was initiated by the server or client, 
          // so we don't need to try reconnecting
        } else {
          // Attempt to reconnect if the disconnection was unintentional
          socket.connect();
        }
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
        setConnecting(false);
        alert(`Game server error: ${typeof error === 'string' ? error : 'Unknown error'}`);
      });
    }

    return () => {
      if (socket) {
        socket.off("gameState");
        socket.off("gameCreated");
        socket.off("gameEnded");
        socket.off("sessionCreated");
        socket.off("sessionInvalid");
        socket.off("playerActionFinished");
        socket.off("connect");
        socket.off("disconnect");
        socket.off("error");
        socket.off("connect_error");
      }
    };
  }, [socket, gameId, playerName, navigate, sessionToken, gameState, location.state]);


  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value > 0) {
      setBetAmount(value);
    }
  };

  const handleAction = (action: string) => {
    if (socket && gameId) {
      switch (action) {
        case "fold":
          socket.emit("playerAction", { gameId, action: "fold" });
          break;
        case "check":
          socket.emit("playerAction", { gameId, action: "check" });
          break;
        case "call":
          socket.emit("playerAction", { gameId, action: "call" });
          break;
        case "bet":
          socket.emit("playerAction", {
            gameId,
            action: "bet",
            amount: betAmount,
          });
          break;
        case "raise":
          socket.emit("playerAction", {
            gameId,
            action: "raise",
            amount: betAmount,
          });
          break;
        case "all-in":
          socket.emit("playerAction", { gameId, action: "raise", amount: currentPlayer.chips });
          break;
        case "start-game":
          socket.emit("startGame", { gameId });
          break;
        default:
          break;
      }
    }
  };

  const handleSitDown = (position: number) => {
    if (socket && gameId) {
      socket.emit("sitDown", { gameId, position });
      setIsSeated(true);
    }
  };

  const exitGame = () => {
    if (socket && gameId) {
      socket.emit("leaveGame", { gameId });
      // Clear session data
      localStorage.removeItem("gameSession");
      setSessionToken(null);
      navigate("/lobby", { state: { playerName } });
    }
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-green-800 text-white text-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mr-3"></div>
        <span>Authenticating...</span>
      </div>
    );
  }

  // Show loading while connecting
  if (connecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-green-800 text-white text-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mr-3"></div>
        <span>Connecting to game...</span>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-screen bg-green-800 text-white text-xl">
        Loading game...
      </div>
    );
  }

  const isPlayerTurn = currentPlayer?.isTurn || false;
  const canCheck =
    isPlayerTurn &&
    (currentPlayer?.currentBet === gameState.currentBet ||
      gameState.currentBet === 0);
  const canCall =
    isPlayerTurn && currentPlayer?.currentBet < gameState.currentBet;
  const canRaise =
    isPlayerTurn && (currentPlayer?.chips || 0) > gameState.currentBet;
  const canBet = isPlayerTurn && gameState.currentBet === 0;
  const showingWinners =
    gameState.phase === "showdown" && gameState.winners.length > 0;

  // Determine the max number of seats for this game
  const maxSeats = gameState.maxPlayers || MAX_SEATS;

  // Generate all seats (filled and empty)
  const allSeats = Array.from({ length: maxSeats }, (_, position) => {
    // Check if this seat is occupied by a player
    const player = gameState.players.find((p) => p.position === position);
    return { position, player };
  });

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-green-800 relative overflow-hidden">
      {/* Exit Button */}
      <button
        onClick={exitGame}
        className="absolute top-4 left-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors z-30"
      >
        Exit Game
      </button>

      {/* Game Info Panel */}
      <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-md z-20 shadow-lg">
        <div className="font-semibold">Phase: {gameState.phase}</div>
        {showingWinners && (
          <div className="mt-2">
            <div className="font-bold mb-1">Winners:</div>
            {gameState.winners.map((winner, idx) => (
              <div key={idx} className="text-sm">
                {winner.name} - {winner.handDescription}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waiting Room Panel */}
      {gameState.waitingPlayers && gameState.waitingPlayers.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white p-3 rounded-md z-20 shadow-lg">
          <div className="font-semibold mb-1">Waiting Players:</div>
          <div className="flex flex-wrap gap-2 max-w-md justify-center">
            {gameState.waitingPlayers.map((name, idx) => (
              <div 
                key={idx} 
                className={`px-2 py-1 text-sm rounded ${name === playerName && !isSeated ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                {name}
              </div>
            ))}
          </div>
          {!isSeated && <div className="text-xs mt-2 text-center">Click on an empty seat to join the game</div>}
        </div>
      )}

      {/* Table */}
      <div className="w-4/5 h-[70%] bg-green-700 rounded-[100px] mx-auto relative border-[15px] border-amber-800 flex flex-col justify-center items-center">
        {/* Pot Display */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-md font-semibold shadow-md">
          Pot: ${gameState.pot}
        </div>

        {/* Community Cards */}
        <div className="flex gap-4 mb-8">
          {gameState.communityCards.map((card, index) => (
            <Card key={index} suit={card.suit} value={card.value} />
          ))}
        </div>

        {/* Game Actions */}
        {gameState.phase === "waiting" && gameState.players.length > 1 && isSeated && (
          <button
            onClick={() => handleAction("start-game")}
            className="bg-blue-700 hover:bg-blue-600 text-white py-2 px-6 rounded-md transition-colors shadow-md font-medium"
          >
            Start Game
          </button>
        )}

        {gameState.phase !== "waiting" && currentPlayer && isPlayerTurn && (
          <div className="flex flex-col gap-2 mt-8 max-w-2xl">
            <div className="grid grid-cols-3 gap-2">
              {/* Row 1, Column 1 */}
              <button
                onClick={() => handleAction("fold")}
                className="bg-red-700 hover:bg-red-600 text-white py-1 px-3 rounded text-sm transition-colors shadow-md"
              >
                Fold
              </button>

              {/* Row 1, Column 2 */}
              <div>
                {canCheck && (
                  <button
                    onClick={() => handleAction("check")}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm transition-colors shadow-md"
                  >
                    Check
                  </button>
                )}

                {canCall && (
                  <button
                    onClick={() => handleAction("call")}
                    className="w-full bg-blue-700 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm transition-colors shadow-md"
                  >
                    Call ${gameState.currentBet}
                  </button>
                )}
              </div>

              {/* Row 1, Column 3 - All In */}
              <button
                onClick={() => handleAction("all-in")}
                className="bg-purple-700 hover:bg-purple-600 text-white py-1 px-3 rounded text-sm transition-colors shadow-md h-full flex items-center justify-center"
              >
                All In (${currentPlayer.chips})
              </button>
              
              {/* Row 2, Columns 1-3 - Betting/Raising */}
              <div className="col-span-3 mt-1">
                {canBet && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={handleBetAmountChange}
                      min={10}
                      max={currentPlayer.chips}
                      className="px-2 py-1 w-20 rounded border-none shadow-inner bg-gray-100 text-black text-sm"
                    />
                    <button
                      onClick={() => handleAction("bet")}
                      className="bg-amber-600 hover:bg-amber-500 text-white py-1 px-3 rounded text-sm transition-colors shadow-md"
                    >
                      Bet ${betAmount}
                    </button>
                  </div>
                )}

                {canRaise && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={handleBetAmountChange}
                      min={gameState.currentBet * 2}
                      max={currentPlayer.chips}
                      className="px-2 py-1 w-20 rounded border-none shadow-inner bg-gray-100 text-black text-sm"
                    />
                    <button
                      onClick={() => handleAction("raise")}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white py-1 px-3 rounded text-sm transition-colors shadow-md"
                    >
                      Raise to ${betAmount}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Players and Empty Seats */}
      <div className="absolute inset-0 pointer-events-none">
        {allSeats.map(({ position, player }) => {
          // Calculate position around the table
          const { top, left } = calculateSeatPosition(position, maxSeats);

          return (
            <div
              key={position}
              className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-md z-10 
                ${
                  player?.isTurn
                    ? "bg-yellow-500/30 border-2 border-yellow-500"
                    : "bg-transparent"
                }
                ${
                  player && !player.isTurn && player.isActive
                    ? "border-2 border-white"
                    : ""
                }
              `}
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              {player ? (
                <Player
                  player={player}
                  isCurrentPlayer={player.name === playerName}
                />
              ) : (
                <EmptySeat 
                  seatNumber={position + 1} 
                  onSit={!isSeated ? handleSitDown : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GamePage;
