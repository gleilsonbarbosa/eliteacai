import React from 'react';
import { useStoreHours } from '../../hooks/useStoreHours';
import { Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const StoreStatusBanner: React.FC = () => {
  const { getStoreStatus, loading, refreshData } = useStoreHours();

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
          <div>
            <h3 className="font-semibold text-gray-600">Verificando status...</h3>
            <p className="text-gray-500">Carregando informações da loja</p>
          </div>
        </div>
      </div>
    );
  }

  const status = getStoreStatus();

  const handleRefresh = async () => {
    try {
      await refreshData();
      
      // Mostrar feedback visual
      const refreshMessage = document.createElement('div');
      refreshMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      refreshMessage.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Status atualizado!
      `;
      document.body.appendChild(refreshMessage);
      
      setTimeout(() => {
        if (document.body.contains(refreshMessage)) {
          document.body.removeChild(refreshMessage);
        }
      }, 2000);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  if (status.isOpen) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">🟢 Loja Aberta</h3>
              <p className="text-green-700">{status.message}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-100 transition-colors"
            title="Atualizar status da loja"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle size={24} className="text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">🔴 Loja Fechada</h3>
            <p className="text-red-700">{status.message}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition-colors"
          title="Atualizar status da loja"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </div>
  );
};

export default StoreStatusBanner;