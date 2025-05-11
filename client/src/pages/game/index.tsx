import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

// Components
import Card from './components/Card';
import Player from './components/Player';
import EmptySeat from './components/EmptySeat';
import BetScroller from './components/BetScroller';
import GameBanner from './components/GameBanner';
import { calculateSeatPosition } from '../../utils/tableUtils';
import { formatChips } from '@/utils/chip';

import {
  GameState,
  GamePhase,
  WAITING_PHASE,
  PRE_FLOP_PHASE,
  FLOP_PHASE,
  TURN_PHASE,
  RIVER_PHASE,
  SHOWDOWN_PHASE,
  JwtGamePayload,
  GameSession,
  MAX_SEATS,
} from './const';

function GamePage() {
  const socketRef = useRef<Socket | null>(null);
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isValidated, error } = useAuth();
  console.log('user', user);
  const storedSession = localStorage.getItem('gameSession');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [sessionToken, setSessionToken] = useState<string | null>(
    storedSession ? JSON.parse(storedSession).token : null
  );
  const [connecting, setConnecting] = useState<boolean>(true);
  const [waitingPanelExpanded, setWaitingPanelExpanded] = useState<boolean>(true);

  // User status
  const isSeated = !!(user && gameState?.seats.some(seat => seat.player?.id === user?.id));
  const currentPlayer = gameState?.players.find(player => player.id === user?.id);
  let bettableAmount = 0;
  if (currentPlayer) {
    bettableAmount = currentPlayer.chips - currentPlayer.currentGameBet;
  }
  const minimumBet = gameState?.minimumBet;
  let maximumBet = 0;
  if (currentPlayer) {
    maximumBet = currentPlayer.chips - currentPlayer.currentGameBet;
  }
  console.log('gameState', gameState);

  // Handle authentication status changes
  useEffect(() => {
    if (
      isValidated && // Only make decisions after auth is validated
      (!user || error) &&
      !location.state?.playerName
    ) {
      navigate('/');
    }
  }, [user, isValidated, error, navigate, location.state]);

  // Socket connection - updated to handle both direct and proxied connections
  useEffect(() => {
    if (!isValidated) return; // Wait until auth validation is complete
    if (!user || !gameId) return; // Only connect if we have a user and gameId
    if (socketRef.current) return;

    setConnecting(true);
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

    let newSocket;

    // Direct connection to the socket server (needs CORS enabled on server)
    newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection established handler
    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setConnecting(false);
    });

    // Connection error handling
    newSocket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
      setConnecting(false);
      // Display an error message to the user
      alert(`Failed to connect to game server: ${err.message}`);
    });

    newSocket.on('gameState', (state: GameState) => {
      console.log('Game state received:', state);
      setGameState(state);
      setBetAmount(state.minimumBet);
    });

    newSocket.on('gameEnded', () => {
      exitGame();
      setTimeout(() => {
        navigate('/lobby', { state: { playerName: user?.name } });
      }, 2000);
    });

    newSocket.on('sessionCreated', createGameSession);

    newSocket.on('sessionInvalid', () => {
      // Session rejected, remove from localStorage
      localStorage.removeItem('gameSession');
      setSessionToken(null);
    });

    newSocket.on('sessionRefresh', data => {
      if (data.token) {
        console.log('Refreshing game session token');
        createGameSession(data);
      }
    });

    newSocket.on('sessionExpiring', () => {
      console.log('Session expiring soon');
      // Request a new token
      newSocket.emit('refreshSession', { gameId, playerName: user?.name });
    });

    // Error handler
    newSocket.on('error', error => {
      console.error('Socket error:', error);
      setConnecting(false);
      toast.error(
        `Game server error: ${typeof error.message === 'string' ? error.message : 'Unknown error'}`,
        {
          duration: 5000, // 5 seconds
        }
      );
      if (error.message === 'Game not found') {
        navigate('/lobby');
      }
    });

    const session = loadGameSession();

    console.log('session', session);
    if (session) {
      // Check if token is about to expire (within 5 minutes)
      try {
        const decodedToken = jwtDecode<JwtGamePayload>(session.token);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decodedToken.exp - currentTime;

        // If token expires in less than 5 minutes, request a new one
        if (timeUntilExpiry < 300) {
          console.log('Token expiring soon, requesting refresh');
          newSocket.emit('refreshSession', { gameId, playerName: user?.name });
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }

      newSocket.emit('joinWaitingRoom', {
        gameId,
        playerName: user?.name || '',
        token: session.token,
      });
    } else {
      console.log('joinWaitingRoom', gameId, user?.name);
      newSocket.emit('joinWaitingRoom', {
        gameId,
        playerName: user?.name || '',
      });
    }
    socketRef.current = newSocket;

    return () => {
      if (socketRef.current) {
        socketRef.current.off('gameState');
        socketRef.current.off('gameEnded');
        socketRef.current.off('sessionCreated');
        socketRef.current.off('sessionInvalid');
        socketRef.current.off('sessionRefresh');
        socketRef.current.off('sessionExpiring');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('error');
        socketRef.current.off('connect_error');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isValidated, user, gameId]);

  const isTokenValid = (token: string): boolean => {
    if (!token) return false;

    try {
      const decodedToken = jwtDecode<JwtGamePayload>(token);
      const currentTime = Math.floor(Date.now() / 1000);

      // Check if token is expired
      if (decodedToken.exp < currentTime) {
        return false;
      }

      // Verify token is for the current game and player
      if (decodedToken.gameId !== gameId || decodedToken.playerName !== user?.name) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  const loadGameSession = () => {
    const storedSession = localStorage.getItem('gameSession');

    if (storedSession) {
      const session: GameSession = JSON.parse(storedSession);

      if (isTokenValid(session.token)) {
        setSessionToken(session.token);
        return session;
      } else {
        // Clear invalid session
        localStorage.removeItem('gameSession');
      }
    }

    return null;
  };

  const createGameSession = data => {
    if (!data.token) {
      console.error('No token received for game session');
      return;
    }

    setSessionToken(data.token);

    try {
      // Decode the token to get expiry
      const decodedToken = jwtDecode<JwtGamePayload>(data.token);

      const sessionData: GameSession = {
        gameId: gameId === 'new' ? '' : gameId,
        playerName: user?.name || '',
        token: data.token,
        tokenExpiry: decodedToken.exp,
      };

      console.log('createGameSession', sessionData);
      localStorage.setItem('gameSession', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error processing game session token:', error);
    }
  };

  const handleStartGame = useCallback(() => {
    const socket = socketRef.current;
    if (socket && gameId && sessionToken) {
      console.log('Starting game');
      socket.emit('startGame', { gameId, token: sessionToken });
    }
  }, [gameId, sessionToken]);

  const handleAction = (action: string) => {
    const socket = socketRef.current;
    if (socket && gameId && sessionToken) {
      switch (action) {
        case 'fold':
          socket.emit('playerAction', {
            gameId,
            action: 'fold',
            token: sessionToken,
          });
          break;
        case 'check':
          socket.emit('playerAction', {
            gameId,
            action: 'check',
            token: sessionToken,
          });
          break;
        case 'call':
          socket.emit('playerAction', {
            gameId,
            action: 'call',
            token: sessionToken,
          });
          break;
        case 'bet':
          socket.emit('playerAction', {
            gameId,
            action: 'bet',
            amount: betAmount,
            token: sessionToken,
          });
          break;
        case 'raise':
          socket.emit('playerAction', {
            gameId,
            action: 'raise',
            amount: betAmount,
            token: sessionToken,
          });
          break;
        case 'all-in':
          socket.emit('playerAction', {
            gameId,
            action: 'raise',
            amount: currentPlayer.chips,
            token: sessionToken,
          });
          break;
        default:
          break;
      }
    } else if (!sessionToken) {
      console.error('No valid session token available for action');
      alert('Your session has expired. Please rejoin the game.');
      exitGame();
    }
  };

  const handleSitDown = (position: number) => {
    const socket = socketRef.current;
    if (socket && gameId) {
      if (sessionToken) {
        socket.emit('sitDown', { gameId, position, token: sessionToken });
      }
    }
  };

  const exitGame = () => {
    const socket = socketRef.current;
    if (socket && gameId) {
      socket.emit('leaveGame', { gameId, token: sessionToken });
      // Clear session data
      localStorage.removeItem('gameSession');
      setSessionToken(null);
      navigate('/lobby');
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

  const isPlayerTurn = gameState.currentRound?.currentActingPlayerSeat.player?.id === user?.id;
  const canCheck = gameState.currentRound?.availableActions.includes('check');
  const canCall = gameState.currentRound?.availableActions.includes('call');
  const canRaise =
    gameState.currentRound?.availableActions.includes('raise') &&
    bettableAmount >= gameState.currentRound.currentBet;
  const canBet = gameState.currentRound?.availableActions.includes('bet');
  const showingWinners = gameState.phase === SHOWDOWN_PHASE && gameState.winners.length > 0;

  // Determine the max number of seats for this game
  const maxSeats = gameState.maxPlayers || MAX_SEATS;

  let showingChips = currentPlayer ? bettableAmount : user?.chips  || 0;

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-green-800 relative overflow-hidden">
      {/* Top Banner - User Status */}
      <GameBanner 
        userName={user?.name}
        userChips={showingChips}
        gamePhase={gameState.phase}
        onExitGame={exitGame}
      />

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
          <div
            className={`bg-gray-900/90 text-white p-3 ${
              waitingPanelExpanded ? 'w-64' : 'w-12'
            } transition-all duration-300 rounded-r-md shadow-lg max-h-full overflow-y-auto relative`}
          >
            {waitingPanelExpanded ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Waiting Players</h3>
                  <button
                    onClick={() => setWaitingPanelExpanded(false)}
                    className="text-gray-300 hover:text-white p-1 rounded hover:bg-gray-800/50 transition-colors"
                    aria-label="Collapse panel"
                  >
                    <CaretLeft size={16} weight="bold" className="text-gray-800 hover:text-white" />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {gameState.waitingPlayers.map((player, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-2 flex justify-between items-center rounded ${
                        player.name === user?.name && !isSeated ? 'bg-blue-800' : 'bg-gray-800'
                      }`}
                    >
                      <span className="font-medium truncate pr-2">{player.name}</span>
                      <span className="text-green-400 text-sm whitespace-nowrap">
                        ${formatChips(player.chips || 0).short}
                      </span>
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
                  <CaretRight size={16} weight="bold" className="text-gray-800" />
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
        {gameState.phase === WAITING_PHASE &&
          gameState.players.length > 1 &&
          isSeated &&
          user.id === gameState.hostId && (
            <button
              onClick={handleStartGame}
              className="bg-blue-700 hover:bg-blue-600 text-white py-2 px-6 rounded-md transition-colors shadow-md font-medium"
            >
              Start Game
            </button>
          )}

        {gameState.phase !== WAITING_PHASE && currentPlayer && isPlayerTurn && (
          <div className="flex flex-col gap-2 mt-6 w-full max-w-lg">
            <div className="flex flex-col gap-2">
              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAction('fold')}
                  className="bg-red-700 hover:bg-red-600 text-white py-2 px-3 rounded transition-colors shadow-md font-medium"
                >
                  Fold
                </button>

                <div>
                  {canCheck && (
                    <button
                      onClick={() => handleAction('check')}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors shadow-md font-medium"
                    >
                      Check
                    </button>
                  )}

                  {canCall && (
                    <button
                      onClick={() => handleAction('call')}
                      className="w-full bg-blue-700 hover:bg-blue-600 text-white py-2 px-3 rounded transition-colors shadow-md font-medium"
                    >
                      Call ${gameState.currentRound?.currentBet}
                    </button>
                  )}
                </div>
              </div>

              {/* Bet/Raise controls */}
              <div className="mt-2">
                {canBet && (
                  <div className="flex flex-col gap-2">
                    <BetScroller
                      minBet={gameState.minimumBet}
                      maxBet={currentPlayer.chips}
                      currentBet={betAmount}
                      onChange={setBetAmount}
                    />
                    <button
                      onClick={() => handleAction('bet')}
                      className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded transition-colors shadow-md font-medium w-full"
                    >
                      Bet ${betAmount}
                    </button>
                  </div>
                )}

                {canRaise && (
                  <div className="flex flex-col gap-2">
                    <BetScroller
                      minBet={minimumBet || gameState.minimumBet}
                      maxBet={maximumBet}
                      currentBet={betAmount}
                      onChange={setBetAmount}
                    />
                    <button
                      onClick={() => handleAction('raise')}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white py-2 px-4 rounded transition-colors shadow-md font-medium w-full"
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
        {gameState.seats.map(seat => {
          const position = seat.positionIndex;
          const player = seat.player;
          // Calculate position around the table
          const { top, left } = calculateSeatPosition(position, maxSeats);

          return (
            <div
              key={position}
              className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-md z-10 
                ${player?.isTurn ? 'bg-yellow-500/30 border-2 border-yellow-500' : 'bg-transparent'}
                ${player && !player.isTurn && player.isActive ? 'border-2 border-white' : ''}
              `}
              style={{ top: `${top + 4}%`, left: `${left}%` }}
            >
              {player ? (
                <Player player={player} isCurrentPlayer={player.name === user?.name} />
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
