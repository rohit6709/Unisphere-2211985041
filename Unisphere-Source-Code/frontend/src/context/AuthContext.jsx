import React, { createContext, useContext, useState } from 'react';
import { logoutByRole } from '@/services/authService';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'unisphere_user';
const ROLE_STORAGE_KEY = 'unisphere_role';

const getStoredAuthState = () => {
  if (typeof window === 'undefined') {
    return { user: null, role: null, isAuthenticated: false, isLoading: false };
  }

  const storedUser = localStorage.getItem(USER_STORAGE_KEY);
  const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);

  if (!storedUser || !storedRole) {
    return { user: null, role: null, isAuthenticated: false, isLoading: false };
  }

  try {
    return {
      user: JSON.parse(storedUser),
      role: storedRole,
      isAuthenticated: true,
      isLoading: false,
    };
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    return { user: null, role: null, isAuthenticated: false, isLoading: false };
  }
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(getStoredAuthState);
  const { user, role, isAuthenticated, isLoading } = authState;

  const persistAuth = (nextUser, nextRole) => {
    if (nextUser && nextRole) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  };

  const login = (userData, userRole) => {
    persistAuth(userData, userRole);
    setAuthState({
      user: userData,
      role: userRole,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const clearAuth = () => {
    persistAuth(null, null);
    setAuthState({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const logout = async () => {
    try {
      if (authState.role) {
        await logoutByRole(authState.role);
      }
    } catch {
      // Clearing local auth is still the right fallback when the backend session is already gone.
    } finally {
      clearAuth();
    }
  };

  const updateUserData = (newData) => {
    const updated = { ...authState.user, ...newData };
    persistAuth(updated, authState.role);
    setAuthState((current) => ({
      ...current,
      user: updated,
      isAuthenticated: Boolean(updated && current.role),
    }));
  };

  const value = {
    user,
    role,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUserData,
    clearAuth,
  };

  return (
    <AuthContext.Provider value={value}>
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
