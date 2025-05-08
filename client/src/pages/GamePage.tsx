import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

// Components
import Card from "../components/Card";
import Player from "../components/Player";
import EmptySeat from "../components/EmptySeat";
import { calculateSeatPosition } from "../utils/tableUtils";
import { formatChips } from "@/utils/chip";

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
  waitingPlayers?: Player[];
}

interface GameSession {
  gameId: string;
  playerName: string;
  token: string;
}

function GamePage() {
  const socketRef = useRef<Socket | null>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isValidated, error } = useAuth();
  const storedSession = localStorage.getItem("gameSession");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [sessionToken, setSessionToken] = useState<string | null>(
    storedSession ? JSON.parse(storedSession).token : null
  );
  const [isSeated, setIsSeated] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(true);
  const [waitingPanelExpanded, setWaitingPanelExpanded] = useState<boolean>(true);

  // Handle authentication status changes
  useEffect(() => {
    if (
      isValidated && // Only make decisions after auth is validated
      (!user || error) &&
      !location.state?.playerName
    ) {
      navigate("/");
    }
  }, [user, isValidated, error, navigate, location.state]);

  // Socket connection - updated to handle both direct and proxied connections
  useEffect(() => {
    if (!isValidated) return; // Wait until auth validation is complete
    if (!user || !gameId) return; // Only connect if we have a user and gameId
    if (socketRef.current) return;

    setConnecting(true);
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

    let newSocket;

    // Direct connection to the socket server (needs CORS enabled on server)
    newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection established handler
    newSocket.on("connect", () => {
      console.log("Socket connected successfully");
      setConnecting(false);
    });

    // Connection error handling
    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setConnecting(false);
      // Display an error message to the user
      alert(`Failed to connect to game server: ${err.message}`);
    });

    newSocket.on("playerActionFinished", (state) => {
      setGameState({
        ...gameState,
        pot: state.pot,
        currentBet: state.currentBet,
      });
    });

    newSocket.on("gameState", (state: GameState) => {
      console.log("Game state received:", state);
      setGameState(state);

      // Check if we're seated at the table
      const isPlayerSeated = state.players.some((p) => p.name === user?.name);
      setIsSeated(isPlayerSeated);

      if (isPlayerSeated) {
        setCurrentPlayer(
          state.players.find((p) => p.name === user?.name) || null
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

    newSocket.on("gameEnded", () => {
      exitGame();
      setTimeout(() => {
        navigate("/lobby", { state: { playerName: user?.name } });
      }, 2000);
    });

    newSocket.on("sessionCreated", createGameSession);

    newSocket.on("sessionInvalid", () => {
      // Session rejected, remove from localStorage
      localStorage.removeItem("gameSession");
      setSessionToken(null);
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      setConnecting(false);
      alert(
        `Game server error: ${
          typeof error === "string" ? error : "Unknown error"
        }`
      );
    });

    const session = loadGameSession();

    console.log('session', session);
    if (session) {
      newSocket.emit("joinWaitingRoom", {
        gameId,
        playerName: user?.name || "",
        token: session.token,
      });
    } else {
      console.log('joinWaitingRoom', gameId, user?.name);
      newSocket.emit("joinWaitingRoom", {
        gameId,
        playerName: user?.name || "",
      });
    }
    socketRef.current = newSocket;

    return () => {
      if (socketRef.current) {
        socketRef.current.off("gameState");
        socketRef.current.off("gameEnded");
        socketRef.current.off("sessionCreated");
        socketRef.current.off("sessionInvalid");
        socketRef.current.off("playerActionFinished");
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("error");
        socketRef.current.off("connect_error");

        socketRef.current.emit("leaveGame", { gameId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isValidated, user, gameId]);

  const loadGameSession = () => {
    const storedSession = localStorage.getItem("gameSession");

    if (storedSession) {
      const session: GameSession = JSON.parse(storedSession);
      // Verify session is for the current game
      if (session.gameId === gameId) {
        setSessionToken(session.token);
      } else {
        // Clear session if it's for a different game
        localStorage.removeItem("gameSession");
      }
      return session;
    }

    return null;
  };

  const createGameSession = (data) => {
    setSessionToken(data.token);
    const sessionData: GameSession = {
      gameId: gameId === "new" ? "" : gameId,
      playerName: user?.name || "",
      token: data.token,
    };

    console.log('createGameSession', sessionData);
    localStorage.setItem("gameSession", JSON.stringify(sessionData));
  };

  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value > 0) {
      setBetAmount(value);
    }
  };

  const handleAction = (action: string) => {
    const socket = socketRef.current;
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
          socket.emit("playerAction", {
            gameId,
            action: "raise",
            amount: currentPlayer.chips,
          });
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
    const socket = socketRef.current;
    if (socket && gameId) {
      socket.emit("sitDown", { gameId, position });
      setIsSeated(true);
    }
  };

  const exitGame = () => {
    const socket = socketRef.current;
    if (socket && gameId) {
      socket.emit("leaveGame", { gameId });
      // Clear session data
      localStorage.removeItem("gameSession");
      setSessionToken(null);
      navigate("/lobby", { state: { playerName: user?.name } });
    }
  };

  // Show loading while checking auth
  if (!isValidated) {
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

  console.log('user', user);
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-green-800 relative overflow-hidden">
      {/* Top Banner - User Status */}
      <div className="fixed top-0 left-0 right-0 bg-gray-900/90 text-white py-3 px-6 flex justify-between items-center z-30 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-bold text-lg">{user?.name || "Player"}</span>
            <span className="text-sm text-gray-300">
                {`Chips: $${user?.chips.short || 0}`}
            </span>
          </div>
        </div>
        <div className="text-center font-semibold">
          {gameState.phase !== "waiting" 
            ? `Game Phase: ${gameState.phase}` 
            : "Waiting for players"}
        </div>
        <button
          onClick={exitGame}
          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          Exit Game
        </button>
      </div>

      {/* Game Info Panel - moved below top banner for better spacing */}
      <div className="absolute top-20 right-4 bg-black/70 text-white p-3 rounded-md z-20 shadow-lg">
        <div className="font-semibold">Pot: ${gameState.pot}</div>
      </div>

      {/* Winners Display */}
      {showingWinners && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-800/90 text-white p-3 rounded-md z-20 shadow-lg">
          <div className="font-bold text-center mb-2">🏆 Winners 🏆</div>
          {gameState.winners.map((winner, idx) => (
            <div key={idx} className="text-sm mb-1 flex items-center">
              <span className="font-semibold mr-2">{winner.name}</span>
              <span className="text-yellow-300">{winner.handDescription}</span>
            </div>
          ))}
        </div>
      )}

      {/* Waiting Players Side Panel */}
      {gameState.waitingPlayers && gameState.waitingPlayers.length > 0 && (
        <div className="fixed left-0 top-20 bottom-20 z-20 flex">
          <div className={`bg-gray-900/90 text-white p-3 ${waitingPanelExpanded ? "w-64" : "w-12"} transition-all duration-300 rounded-r-md shadow-lg max-h-full overflow-y-auto relative`}>
            {waitingPanelExpanded ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Waiting Players</h3>
                  <button 
                    onClick={() => setWaitingPanelExpanded(false)}
                    className="text-gray-300 hover:text-white p-1 rounded hover:bg-gray-800/50 transition-colors"
                    aria-label="Collapse panel"
                  >
                    <CaretLeft size={16} weight="bold" className="text-gray-800 hover:text-white"/>
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {gameState.waitingPlayers.map((player, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-2 flex justify-between items-center rounded ${
                        player.name === user?.name && !isSeated
                          ? "bg-blue-800"
                          : "bg-gray-800"
                      }`}
                    >
                      <span className="font-medium truncate pr-2">{player.name}</span>
                      <span className="text-green-400 text-sm whitespace-nowrap">${formatChips(player.chips || 0).short}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center">
                <button 
                  onClick={() => setWaitingPanelExpanded(true)}
                  className="text-gray-300 p-1 mt-2 rounde transition-colors"
                  aria-label="Expand panel"
                >
                  <CaretRight size={16} weight="bold" className="text-gray-800"/>
                </button>
                <div className="flex-1 flex items-center">
                  <span className="rotate-90 transform whitespace-nowrap text-xs font-medium text-gray-300">
                    Waiting ({gameState.waitingPlayers.length})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table - adjust to account for the top banner */}
      <div className="w-4/5 h-[70%] bg-green-700 rounded-[100px] mx-auto relative border-[15px] border-amber-800 flex flex-col justify-center items-center mt-16">
        {/* Community Cards */}
        <div className="flex gap-4 mb-8">
          {gameState.communityCards.map((card, index) => (
            <Card key={index} suit={card.suit} value={card.value} />
          ))}
        </div>

        {/* Game Actions */}
        {gameState.phase === "waiting" &&
          gameState.players.length > 1 &&
          isSeated && (
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
              style={{ top: `${top+4}%`, left: `${left}%` }}
            >
              {player ? (
                <Player
                  player={player}
                  isCurrentPlayer={player.name === user?.name}
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
