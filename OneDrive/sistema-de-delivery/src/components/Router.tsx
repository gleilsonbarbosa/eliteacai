import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DeliveryPage from './Delivery/DeliveryPage';
import OrderTrackingPage from './Customer/OrderTrackingPage';
import OrderLookup from './Customer/OrderLookup';
import CustomerCashbackPage from './Customer/CustomerCashbackPage';
import AdminPage from './Admin/AdminPage';
import UnifiedAttendancePage from './UnifiedAttendancePage';
import AccessDeniedPage from './AccessDeniedPage';
import { useState } from 'react';
import PDVLogin from './PDV/PDVLogin';
import PDVMain from './PDV/PDVMain';
import { PDVOperator } from '../types/pdv';
import NotFoundPage from './NotFoundPage';

const Router: React.FC = () => {
  // Solicitar permissão para notificações ao iniciar o app
  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      // Solicitar permissão
      Notification.requestPermission().then(permission => {
        console.log('Permissão de notificação:', permission);
      });
    }
  }, []);

  const [loggedInOperator, setLoggedInOperator] = useState<PDVOperator | null>(null);

  const handlePDVLogin = (operator: PDVOperator) => {
    setLoggedInOperator(operator);
    localStorage.setItem('pdv_operator', JSON.stringify(operator));
    window.location.href = '/pdv/app'; 
  };

  const handlePDVLogout = () => {
    setLoggedInOperator(null);
    localStorage.removeItem('pdv_operator');
    window.location.href = '/pdv';
  };
  
  // Check for stored operator on component mount
  useEffect(() => {
    const storedOperator = localStorage.getItem('pdv_operator');
    if (storedOperator) {
      try {
        const operator = JSON.parse(storedOperator);
        setLoggedInOperator(operator);
      } catch (error) {
        console.error('Error parsing stored operator:', error);
        localStorage.removeItem('pdv_operator');
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeliveryPage />} />
        <Route path="/buscar-pedido" element={<OrderLookup />} />
        <Route path="/pedido/:orderId" element={<OrderTrackingPage />} />
        <Route path="/meu-cashback" element={<CustomerCashbackPage />} />
        <Route path="/atendimento" element={<UnifiedAttendancePage />} />
        <Route path="/administrativo" element={<AdminPage />} />
        <Route path="/acesso-negado" element={<AccessDeniedPage />} />
        <Route path="/pdv" element={loggedInOperator ? <PDVMain onBack={handlePDVLogout} operator={loggedInOperator} /> : <PDVLogin onLogin={handlePDVLogin} />} />
        <Route path="/pdv/app" element={loggedInOperator ? <PDVMain onBack={handlePDVLogout} operator={loggedInOperator} /> : <PDVLogin onLogin={handlePDVLogin} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;