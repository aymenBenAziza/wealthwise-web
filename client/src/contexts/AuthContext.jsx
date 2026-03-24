import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import http from '../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wealthwise_token');
    if (!token) {
      setLoading(false);
      return;
    }

    http.get('/users/me')
      .then((response) => setUser(response.data.user))
      .catch(() => {
        localStorage.removeItem('wealthwise_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const response = await http.post('/auth/login', credentials);
    localStorage.setItem('wealthwise_token', response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  async function register(payload) {
    const response = await http.post('/auth/register', payload);
    localStorage.setItem('wealthwise_token', response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  async function refreshProfile() {
    const response = await http.get('/users/me');
    setUser(response.data.user);
    return response.data.user;
  }

  async function updateProfile(payload) {
    const response = await http.put('/users/me', payload);
    setUser(response.data.user);
    return response.data.user;
  }

  function logout() {
    localStorage.removeItem('wealthwise_token');
    setUser(null);
  }

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    refreshProfile,
    updateProfile,
    isAuthenticated: Boolean(user),
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
