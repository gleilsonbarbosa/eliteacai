import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, Home, ArrowLeft } from 'lucide-react';

interface AccessDeniedPageProps {
  message?: string;
  backPath?: string;
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ 
  message = 'Você não tem permissão para acessar esta página.',
  backPath = '/'
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <ShieldOff size={36} className="text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Acesso Negado</h1>
        
        <p className="text-gray-600 mb-8">
          {message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(backPath)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Página Inicial
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;