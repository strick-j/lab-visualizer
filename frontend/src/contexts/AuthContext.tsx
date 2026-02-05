import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, AuthConfig, LoginCredentials, TokenResponse } from '@/types';
import {
  getAuthConfig,
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  refreshToken as apiRefreshToken,
} from '@/api/client';

interface AuthContextType {
  user: User | null;
  authConfig: AuthConfig | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const storeTokens = useCallback((tokens: TokenResponse) => {
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const userData = await getCurrentUser();
      return userData;
    } catch {
      // Token might be expired, try to refresh
      const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshTokenValue) {
        try {
          const newTokens = await apiRefreshToken(refreshTokenValue);
          storeTokens(newTokens);
          const userData = await getCurrentUser();
          return userData;
        } catch {
          // Refresh failed, clear tokens
          clearTokens();
          return null;
        }
      }
      clearTokens();
      return null;
    }
  }, [storeTokens, clearTokens]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const tokens = await apiLogin(credentials);
      storeTokens(tokens);

      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [storeTokens]);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await apiLogout();
    } catch {
      // Ignore logout errors - we're clearing local state anyway
    } finally {
      clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  }, [clearTokens]);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await fetchUser();
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  // Set tokens from OIDC callback and fetch user
  const setTokensCallback = useCallback(async (accessToken: string, refreshToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Store tokens
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      // Fetch user data
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      clearTokens();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearTokens]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      try {
        // Fetch auth config first
        const config = await getAuthConfig();
        setAuthConfig(config);

        // If no auth methods are enabled, skip user fetch
        if (!config.local_auth_enabled && !config.oidc_enabled) {
          setIsLoading(false);
          return;
        }

        // Try to fetch current user if we have a token
        const userData = await fetchUser();
        setUser(userData);
      } catch {
        // Auth config fetch failed, assume auth is enabled with local login
        setAuthConfig({
          local_auth_enabled: true,
          oidc_enabled: false,
          oidc_issuer: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authConfig,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        refreshAuth,
        clearError,
        setTokens: setTokensCallback,
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
