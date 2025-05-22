import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveGames, useCreateGame } from '../hooks/useGames';
import { useAuthContext } from '../context';
import { gameApi } from '../services/api';
import toast from 'react-hot-toast';
import Header from '../components/header';

function LobbyPage() {
  const navigate = useNavigate();
  const [newGameName, setNewGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isJoiningGame, setIsJoiningGame] = useState<string | null>(null);
  
  // Use auth context
  const { user, isAuthenticated, isLoading, error, clearError } = useAuthContext();
  
  // Use custom hooks
  const { data: games = [], isLoading: gamesLoading, error: gamesError } = useActiveGames();
  const createGameMutation = useCreateGame();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Clear any auth errors when unmounting
  useEffect(() => {
    return () => {
      if (error) clearError();
    };
  }, [error, clearError]);


  // If still loading auth, show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If not authenticated and not loading, show error
  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full p-8 gap-4">
        <div className="bg-red-600 text-white p-4 rounded-md max-w-md text-center">
          {error ? (
            <>
              <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
              <p>{error.message}</p>
            </>
          ) : (
            <p>You must be logged in to view this page.</p>
          )}
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-green-600 text-white px-4 py-2 rounded-md mt-4"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const handleCreateGame = () => {
    if (newGameName.trim()) {
      createGameMutation.mutate({ 
        name: newGameName, 
        maxPlayers, 
        creatorId: user.id
      }, {
        onSuccess: (data) => {
          navigate(`/game/${data.id}`);
        },
        onError: (error) => {
          console.error('Failed to create game:', error);
        }
      });
    }
  };

  const handleJoinGame = async (gameId: string) => {
    try {
      setIsJoiningGame(gameId);
      const response = await gameApi.getJoinableGameById(gameId);
      if (response.data) {
        navigate(`/game/${gameId}`);
      } else {
        toast.error('This game no longer exists or is not available.');
      }
    } catch (error) {
      alert('This game no longer exists or is not available.');
    } finally {
      setIsJoiningGame(null);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Use the Header component */}
      <Header />

      <div className="flex flex-col items-center p-8 w-full max-w-7xl mx-auto">
        
        <div className="flex flex-col w-full gap-4 mb-8">
          <h2 className="text-2xl text-gray-200">Available Games</h2>
          
          {gamesError && (
            <div className="p-4 bg-red-800 text-white rounded-md">
              Failed to load games. Please try again later.
            </div>
          )}
          
          {gamesLoading ? (
            <div className="text-gray-300">Loading games...</div>
          ) : games.length === 0 ? (
            <p className="text-gray-300">No games available. Create one below!</p>
          ) : (
            games.map((game) => (
              <div key={game.id} className="flex justify-between items-center p-4 bg-gray-800 rounded-md">
                <div>
                  <h3 className="text-xl text-gray-200">{game.name}</h3>
                  <p className="text-gray-300">Players: {game.players.length}/{game.maxPlayers}</p>
                </div>
                <button 
                  onClick={() => handleJoinGame(game.id)}
                  disabled={game.players.length >= game.maxPlayers || isJoiningGame === game.id}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    game.players.length >= game.maxPlayers 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : isJoiningGame === game.id
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
                  }`}
                >
                  {game.players.length >= game.maxPlayers 
                    ? 'Full' 
                    : isJoiningGame === game.id
                    ? 'Joining...'
                    : 'Join'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col w-full max-w-2xl gap-4 p-4 bg-gray-800 rounded-md">
          <h2 className="text-2xl text-gray-200">Create New Game</h2>
          {createGameMutation.isError && (
            <div className="p-3 bg-red-700 text-white rounded-md text-sm">
              Failed to create game. Please try again.
            </div>
          )}
          <input
            type="text"
            placeholder="Game Name"
            value={newGameName}
            onChange={(e) => setNewGameName(e.target.value)}
            className="p-2 text-base border border-gray-700 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex items-center gap-2">
            <label className="text-gray-300">
              Max Players:
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="ml-2 p-2 bg-gray-700 text-gray-100 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button 
            onClick={handleCreateGame}
            disabled={createGameMutation.isPending || !newGameName.trim()}
            className="bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {createGameMutation.isPending ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LobbyPage; 