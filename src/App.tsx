import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/Login';
import ClientDashboard from './pages/client/Dashboard';
import PasswordReset from './pages/client/PasswordReset';
import Terms from './pages/client/Terms';
import HowItWorks from './pages/client/HowItWorks';
import Promotions from './pages/client/Promotions';
import PaymentSuccess from './pages/payment/Success';
import PaymentCancel from './pages/payment/Cancel';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/client" replace />} />
        
        {/* Client Routes */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientDashboard />} />
          <Route path="terms" element={<Terms />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="promotions" element={<Promotions />} />
        </Route>

        {/* Payment Routes */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        {/* Password Reset Route */}
        <Route path="/reset-password" element={<PasswordReset />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/client" replace />} />
      </Routes>
    </>
  );
}

export default App;