import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user, isLoading, error, clearError } = useAuth();
  
  const isProduction = import.meta.env.NODE_ENV === 'production';

  // If user is already authenticated, pre-fill the name
  useEffect(() => {
    if (user) {
      setPlayerName(user.name);
      setUsername(user.name);
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
    if (isProduction) {
      if (!username.trim() || !password.trim()) {
        return;
      }
      
      try {
        // In production, we would pass both username and password
        // For now, just using the username to maintain compatibility
        await login(username);
        navigate('/lobby');
      } catch (err) {
        console.error('Login error caught in component:', err);
      }
    } else {
      if (!playerName.trim()) {
        return;
      }
      
      try {
        await login(playerName);
        navigate('/lobby');
      } catch (err) {
        console.error('Login error caught in component:', err);
      }
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
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-8 gap-8">
      <div className="relative">
        <h1 className="text-5xl text-gray-100 drop-shadow-lg mb-8">Open Texas</h1>
        <div 
          className="relative cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="absolute -right-16 top-0 bg-red-500 text-white text-xs px-2 py-1 rounded-md transform rotate-12 font-bold">
            ALPHA
          </span>
          {showTooltip && (
            <div className="absolute top-8 -right-48 w-64 p-3 bg-gray-800 border border-gray-700 rounded-md shadow-lg text-sm text-gray-200 z-10">
              <p>During the Alpha version:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Breaking changes are updated frequently</li>
                <li>No guarantee for user data persistence</li>
                <li>Invitation required - <Link to="/contact" className="text-green-400 hover:underline">Contact us</Link> to get access</li>
              </ul>
              <div className="absolute -top-2 right-48 w-3 h-3 bg-gray-800 border-t border-l border-gray-700 transform rotate-45"></div>
            </div>
          )}
        </div>
      </div>
      
      {isProduction ? (
        // Production sign-in form with username/password
        <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl text-green-400 font-semibold mb-6 text-center">Sign In</h2>
          
          {error && (
            <div className="bg-red-600 text-white p-3 rounded-md mb-4">
              {error.message}
              {error.code === 'validation_error' && (
                <div className="text-sm mt-1">Please enter valid credentials to continue.</div>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) clearError();
                }}
                className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) clearError();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && username.trim() && password.trim()) {
                      handleJoinLobby();
                    }
                  }}
                  className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            
            <button 
              onClick={handleJoinLobby}
              disabled={!username.trim() || !password.trim()}
              className="w-full bg-green-600 text-white px-6 py-3 text-lg rounded-md cursor-pointer transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {user ? 'Continue to Lobby' : 'Sign In'}
            </button>
            
            <div className="text-center text-sm">
              <a href="#" className="text-green-400 hover:underline">Forgot password?</a>
            </div>
          </div>
        </div>
      ) : (
        // Development mode - simple name input
        <>
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
        </>
      )}
      
      <div className="text-center text-sm text-gray-400 mb-4">
        By joining the lobby, you agree to our <Link to="/terms" className="text-green-400 hover:underline">Terms & Conditions</Link> and <Link to="/privacy" className="text-green-400 hover:underline">Privacy Policy</Link>
      </div>
      
      <div className="mt-4">
        <Link to="/rules" className="text-green-400 hover:text-green-300 underline text-lg">
          View Poker Rules
        </Link>
      </div>

      <div className="mt-4">
        <Link to="/contact" className="text-green-400 hover:text-green-300 underline text-lg">
          Contact Us
        </Link>
      </div>
      
      <div className="mt-auto pt-6 text-gray-500 text-sm">
        © 2025 All rights reserved by <a href="https://vertile.ai" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">vertile.ai</a>
      </div>
    </div>
  );
}

export default HomePage; 