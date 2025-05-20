import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { userApi } from '../services/api';
import axios from 'axios';

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

  const handleApiError = (error: unknown, defaultMessage: string) => {
    let errorMessage = defaultMessage;
    let errorCode = 'unknown_error';
    let status: number | undefined = undefined;
    
    if (axios.isAxiosError(error)) {
      status = error.response?.status;
      
      // Try to extract error message from response
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      // Map status codes to specific error codes
      if (status === 400) errorCode = 'bad_request';
      else if (status === 401) errorCode = 'unauthorized';
      else if (status === 403) errorCode = 'forbidden';
      else if (status === 404) errorCode = 'not_found';
      else if (status === 409) errorCode = 'conflict';
      else if (status === 500) errorCode = 'server_error';
    }
    
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
      const response = await userApi.getCurrentUser();
      const userData = response.data;
      
      console.log('userData', userData);
      setUser(userData);
      if (error) {
        clearError();
      }
      return true;
    } catch (error) {
      localStorage.removeItem('auth_token');
      setUser(null);
      handleApiError(error, 'Failed to authenticate user');
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
      const response = await userApi.login(name);
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      setUser(user);
      isValidated.current = true;
    } catch (error) {
      console.error('Login error:', error);
      handleApiError(error, 'Failed to login');
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