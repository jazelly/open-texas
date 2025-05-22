import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context';
import { Eye } from '@phosphor-icons/react';
import { EyeSlash } from '@phosphor-icons/react';
import Footer from '../components/footer';
import toast from 'react-hot-toast';

function HomePage() {
  const [showSignUp, setShowSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();
  const { login, signup, isAuthenticated, user, isLoading, error, clearError } = useAuthContext();

  useEffect(() => {
    if (user) {
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

  // Show toast notifications for errors
  useEffect(() => {
    if (error?.message) {
      toast.error(error.message);
      
      // Show additional message for validation errors
      if (error.code === 'validation_error') {
        toast.error('Please enter valid credentials to continue.', {
          id: 'validation-error',
          duration: 4000
        });
      }
    }
  }, [error]);

  useEffect(() => {
    if (formError) {
      toast.error(formError);
    }
  }, [formError]);

  const handleSignIn = async () => {
    if (!username.trim() || !password.trim()) {
      setFormError('Username/email and password are required');
      return;
    }

    try {
      await login(username, password);
      navigate('/lobby');
    } catch (err) {
      console.error('Login error caught in component:', err);
    }
  };

  const handleSignUp = async () => {
    // Validate inputs
    if (!username.trim()) {
      setFormError('Username is required');
      return;
    }

    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }

    if (!password.trim()) {
      setFormError('Password is required');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      await signup(username, email, password);
      navigate('/lobby');
    } catch (err: any) {
      console.error('Signup error caught in component:', err);
      // Handle structured error responses from the server
      if (err.response?.data) {
        const { error, code } = err.response.data;
        setFormError(error || 'Failed to create account');
        
        // You can add specific UI handling based on error codes if needed
        if (code === 'UserNameTaken' || code === 'UserEmailAlreadyRegistered') {
          // Maybe highlight the specific field that has the error
          console.log('Duplicate field error:', code);
        }
      } else if (err.message) {
        setFormError(err.message);
      } else {
        setFormError('An unexpected error occurred');
      }
    }
  };

  const toggleForm = () => {
    setShowSignUp(!showSignUp);
    clearError();
    setFormError('');
    setPassword('');
    setConfirmPassword('');
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
      <div className="mb-8 relative">
        <h1 className="text-5xl text-gray-100 drop-shadow-lg relative">
          Open Texas
          <span
            className="absolute -right-16 top-0 bg-red-500 text-white text-xs px-2 py-1 rounded-md transform rotate-12 font-bold cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            ALPHA
            {showTooltip && (
              <div className="absolute top-8 -right-32 w-64 p-3 bg-gray-800 border border-gray-700 rounded-md shadow-lg text-sm text-gray-200 z-10">
                <p>During the Alpha version:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li>Breaking changes are updated frequently</li>
                  <li>No guarantee for user data persistence</li>
                  <li>
                    Invitation required -{' '}
                    <Link to="/contact" className="text-green-400 hover:underline">
                      Contact us
                    </Link>{' '}
                    to get access
                  </li>
                </ul>
                <div className="absolute -top-2 right-32 w-3 h-3 bg-gray-800 border-t border-l border-gray-700 transform rotate-45"></div>
              </div>
            )}
          </span>
        </h1>
      </div>

      <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl text-green-400 font-semibold mb-6 text-center">
          {showSignUp ? 'Sign Up' : 'Sign In'}
        </h2>

        {!showSignUp ? (
          /* Sign In Form */
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-gray-300 mb-2">
                Username or Email
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (error || formError) {
                    clearError();
                    setFormError('');
                  }
                }}
                className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                placeholder="Enter your username or email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error || formError) {
                      clearError();
                      setFormError('');
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && username.trim() && password.trim()) {
                      handleSignIn();
                    }
                  }}
                  className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                  placeholder="Enter your password"
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignIn}
              disabled={!username.trim() || !password.trim()}
              className="w-full bg-green-600 text-white px-6 py-3 text-lg rounded-md cursor-pointer transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Sign In
            </button>

            <div className="flex justify-between items-center text-sm">
              <a href="#" className="text-green-400 hover:underline">
                Forgot password?
              </a>
              <button onClick={toggleForm} className="text-green-400 hover:underline">
                Create an account
              </button>
            </div>

            <div className="text-center text-sm text-gray-400 mb-4">
              By joining the lobby <br />
              you agree to our{' '}
              <Link to="/terms" className="text-green-400 hover:underline">
                Terms & Conditions
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-green-400 hover:underline">
                Privacy Policy
              </Link>
            </div>
          </div>
        ) : (
          /* Sign Up Form */
          <div className="space-y-4">
            <div>
              <label htmlFor="signup-username" className="block text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="signup-username"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (error || formError) {
                    clearError();
                    setFormError('');
                  }
                }}
                className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (error || formError) {
                    clearError();
                    setFormError('');
                  }
                }}
                className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signup-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error || formError) {
                      clearError();
                      setFormError('');
                    }
                  }}
                  className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                  placeholder="Create a password (min. 8 characters)"
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (error || formError) {
                      clearError();
                      setFormError('');
                    }
                  }}
                  onKeyDown={e => {
                    if (
                      e.key === 'Enter' &&
                      username.trim() &&
                      password.trim() &&
                      password === confirmPassword
                    ) {
                      handleSignUp();
                    }
                  }}
                  className="px-4 py-3 text-base border border-gray-700 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-gray-100"
                  placeholder="Confirm your password"
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignUp}
              disabled={
                !username.trim() ||
                !email.trim() ||
                !password.trim() ||
                password !== confirmPassword
              }
              className="w-full bg-green-600 text-white px-6 py-3 text-lg rounded-md cursor-pointer transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Create Account
            </button>

            <div className="text-center text-sm">
              <button onClick={toggleForm} className="text-green-400 hover:underline">
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default HomePage;
