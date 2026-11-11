import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMeProfile } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nexusflow_token'));
  const [loading, setLoading] = useState(true);

  // Validate existing token and restore session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('nexusflow_token');
      if (storedToken) {
        try {
          const res = await getMeProfile();
          if (res.success && res.user) {
            setUser(res.user);
            setToken(storedToken);
          } else {
            // Invalid response
            localStorage.removeItem('nexusflow_token');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.warn('Session expired or invalid token:', error.response?.data?.message || error.message);
          localStorage.removeItem('nexusflow_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('nexusflow_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (name, email, password) => {
    const res = await registerUser({ name, email, password });
    if (res.success && res.token) {
      localStorage.setItem('nexusflow_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('nexusflow_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
