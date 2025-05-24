import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { userApi } from '../services/api';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  chips: number;
  email?: string;
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
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string | null, password: string) => Promise<void>;
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

  const login = async (username: string, password: string): Promise<void> => {
    const requestId = Math.random().toString(36).substring(7);
    const loginAttempt = {
      requestId,
      username,
      hasPassword: !!password,
      passwordLength: password?.length || 0,
      isEmail: username?.includes('@'),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      localStorage: {
        authToken: !!localStorage.getItem('auth_token'),
        gameSession: !!localStorage.getItem('gameSession'),
        totalItems: localStorage.length
      }
    };
    
    console.log('🔐 Frontend login attempt:', loginAttempt);
    
    if (!username.trim() || !password.trim()) {
      console.warn('❌ Validation failed:', { requestId, username: !!username.trim(), password: !!password.trim() });
      setError({
        message: 'Username/email and password are required',
        code: 'validation_error'
      });
      return;
    }

    setIsLoading(true);
    isValidated.current = false;
    clearError();
    
    try {
      console.log('📡 Making API call:', { requestId, endpoint: '/api/users/signin' });
      const response = await userApi.login(username, password);
      const { token, user } = response.data;
      
      console.log('✅ Login successful:', { 
        requestId, 
        userId: user?.id, 
        username: user?.name,
        hasToken: !!token,
        tokenLength: token?.length || 0
      });
      
      localStorage.setItem('auth_token', token);
      setUser(user);
      isValidated.current = true;
    } catch (error) {
      console.error('❌ Login error:', { 
        requestId, 
        error: axios.isAxiosError(error) ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        } : error,
        username,
        attemptNumber: loginAttempt.localStorage.totalItems
      });
      handleApiError(error, 'Invalid username or password');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string | null, password: string): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      setError({
        message: 'Username and password are required',
        code: 'validation_error'
      });
      return;
    }

    setIsLoading(true);
    isValidated.current = false;
    clearError();
    
    try {
      const response = await userApi.signup(username, email, password);
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      setUser(user);
      isValidated.current = true;
    } catch (error) {
      console.error('Signup error:', error);
      handleApiError(error, 'Failed to create account');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const logoutInfo = {
      requestId: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      beforeLogout: {
        authToken: !!localStorage.getItem('auth_token'),
        gameSession: !!localStorage.getItem('gameSession'),
        totalItems: localStorage.length,
        user: user ? { id: user.id, name: user.name } : null
      }
    };
    
    console.log('🚪 Logout initiated:', logoutInfo);
    
    localStorage.removeItem('auth_token');
    setUser(null);
    isValidated.current = false;
    clearError();
    
    console.log('🚪 Logout completed:', {
      requestId: logoutInfo.requestId,
      afterLogout: {
        authToken: !!localStorage.getItem('auth_token'),
        gameSession: !!localStorage.getItem('gameSession'),
        totalItems: localStorage.length
      }
    });
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
        signup, 
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