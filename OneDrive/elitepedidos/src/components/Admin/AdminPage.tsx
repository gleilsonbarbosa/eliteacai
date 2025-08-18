import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import { useAdmin } from '../../hooks/useAdmin';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, login, logout } = useAdmin();

  // Se o admin está logado, mostrar painel administrativo
  if (session.isAuthenticated) {
    return (
      <AdminPanel onLogout={logout} />
    );
  }

  // Se não está logado, mostrar tela de login
  return (
    <AdminLogin 
      onLogin={(username, password) => {
        const success = login(username, password);
        return success;
      }} 
    />
  );
};

export default AdminPage;