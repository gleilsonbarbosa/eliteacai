import { useState, useCallback } from 'react';
import { AdminSession } from '../types/product';

const ADMIN_CREDENTIALS = {
  username: 'admin', 
  password: 'elite2024'
};

export const useAdmin = () => {
  const [session, setSession] = useState<AdminSession>({
    isAuthenticated: false
  });

  const login = useCallback((username: string, password: string): boolean => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      console.log('Admin login successful');
      setSession({
        isAuthenticated: true,
        user: {
          id: '1',
          username: ADMIN_CREDENTIALS.username,
          password: '',
          role: 'admin'
        }
      });
      return true;
    }
    console.log('Admin login failed');
    return false;
  }, []);

  const logout = useCallback(() => {
    console.log('Admin logout');
    setSession({
      isAuthenticated: false
    });
  }, []);

  return {
    session,
    login,
    logout
  };
};