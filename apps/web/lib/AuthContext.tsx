import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  role: string;
  display_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
      setError(null);
    } catch (err) {
      setUser(null);
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoggingIn(true);
    setError(null);

    try {
      const response = await authApi.login(username, password);
      
      localStorage.setItem('auth_token', response.session.access_token);
      localStorage.setItem('refresh_token', response.session.refresh_token || '');
      
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        try {
          await refreshUser();
        } catch (err) {
          localStorage.removeItem('auth_token');
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isLoggingIn, error, login, logout, refreshUser }}>
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
