import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface User {
  id: string;
  name: string;
  chips: number;
}

export interface AuthError {
  message: string;
  code: string;
  status?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidated: boolean;
  error: AuthError | null;
  login: (name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isValidated = useRef(false);
  const [error, setError] = useState<AuthError | null>(null);

  // Reset validation state on route change
  useEffect(() => {
    console.log('check auth');
    checkAuth();
  }, []);

  const handleApiError = async (response: Response, defaultMessage: string) => {
    const status = response.status;
    let errorMessage = defaultMessage;
    
    try {
      // Try to parse the error message from the response
      const data = await response.json();
      if (data && data.error) {
        errorMessage = data.error;
      }
    } catch (e) {
      // If we can't parse the JSON, just use the default message
      console.error('Error parsing error response:', e);
    }
    
    let errorCode = 'unknown_error';
    
    // Map status codes to specific error codes
    if (status === 400) errorCode = 'bad_request';
    else if (status === 401) errorCode = 'unauthorized';
    else if (status === 403) errorCode = 'forbidden';
    else if (status === 404) errorCode = 'not_found';
    else if (status === 409) errorCode = 'conflict';
    else if (status === 500) errorCode = 'server_error';
    
    setError({
      message: errorMessage,
      code: errorCode,
      status
    });
  };

  const clearError = () => {
    setError(null);
  };

  const checkAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    
    isValidated.current = true;
    if (!token) {
      setIsLoading(false);
      setUser(null);
      return false;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw response;
      }
      
      const userData = await response.json();
      console.log('userData', userData);
      setUser(userData);
      if (error) {
        clearError();
      }
      return true;
    } catch (error) {
      localStorage.removeItem('auth_token');
      setUser(null);
      
      if (error instanceof Response) {
        await handleApiError(error, 'Failed to authenticate user');
      } else {
        setError({
          message: 'Network error. Please check your connection.',
          code: 'network_error'
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (name: string): Promise<void> => {
    if (!name.trim()) {
      setError({
        message: 'Name is required',
        code: 'validation_error'
      });
      return;
    }

    setIsLoading(true);
    isValidated.current = false;
    clearError();
    
    try {
      const response = await fetch(`${API_URL}/users/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        throw response;
      }
      
      const data = await response.json();
      const { token, user } = data;
      
      localStorage.setItem('auth_token', token);
      setUser(user);
      isValidated.current = true;
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Response) {
        await handleApiError(error, 'Failed to login');
      } else {
        setError({
          message: 'Network error. Please check your connection.',
          code: 'network_error'
        });
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    isValidated.current = false;
    clearError();
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user,
        isAuthenticated: !!user, 
        isLoading,
        isValidated: isValidated.current,
        error,
        login, 
        logout,
        checkAuth,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 