'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const initializeAuth = () => {
      try {
        console.log("Initializing auth state from localStorage");
        const token = localStorage.getItem('token');
        console.log("Found token in localStorage:", !!token);

        if (token) {
          setAuthState(prev => ({ ...prev, token, loading: false }));
        } else {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error("Error reading from localStorage:", err);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);

      setAuthState({
        user: null, // We'll fetch user details separately
        token: data.access_token,
        loading: false,
        error: null,
      });

      return true;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if needed
      if (authState.token) {
        try {
          await fetch('http://localhost:8000/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authState.token}`
            }
          });
        } catch (fetchError) {
          console.warn('Error calling logout endpoint, proceeding with local logout:', fetchError);
          // Continue with logout even if API call fails
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('token');
      setAuthState({
        user: null,
        token: null,
        loading: false,
        error: null,
      });
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      return true;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
      return false;
    }
  };

  return {
    user: authState.user,
    token: authState.token,
    loading: authState.loading,
    error: authState.error,
    login,
    logout,
    register,
    isAuthenticated: !!authState.token
  };
}