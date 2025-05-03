import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated, user, isLoading, error, clearError } = useAuth();

  // If user is already authenticated, pre-fill the name
  useEffect(() => {
    if (user) {
      setPlayerName(user.name);
    }
  }, [user]);

  // Redirect to lobby if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/lobby');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleJoinLobby = async () => {
    if (!playerName.trim()) {
      return; // Login function handles this validation now
    }

    try {
      // Authenticate user (creates if doesn't exist)
      await login(playerName);
      // Navigate to lobby
      navigate('/lobby');
    } catch (err) {
      // Error is now handled in the useAuth hook
      console.error('Login error caught in component:', err);
    }
  };

  // Show loading indicator while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full p-8 gap-8">
      <h1 className="text-5xl text-gray-100 drop-shadow-lg mb-8">Texas Hold'em</h1>
      
      {playerName && (
        <h2 className="text-3xl text-green-400 font-semibold mb-4">
          Welcome, {playerName}!
        </h2>
      )}
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-md mb-4">
          {error.message}
          {error.code === 'validation_error' && (
            <div className="text-sm mt-1">Please enter a valid name to continue.</div>
          )}
        </div>
      )}
      
      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => {
          setPlayerName(e.target.value);
          if (error) clearError();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && playerName.trim()) {
            handleJoinLobby();
          }
        }}
        className="px-4 py-4 text-base border border-gray-300 rounded-md w-72 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
      />
      
      <button 
        onClick={handleJoinLobby}
        disabled={!playerName.trim()}
        className="bg-green-600 text-white px-8 py-4 text-xl rounded-md cursor-pointer transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {user ? 'Continue to Lobby' : 'Join Lobby'}
      </button>
      
      <div className="mt-8">
        <Link to="/rules" className="text-green-400 hover:text-green-300 underline text-lg">
          View Poker Rules
        </Link>
      </div>
    </div>
  );
}

export default HomePage; 