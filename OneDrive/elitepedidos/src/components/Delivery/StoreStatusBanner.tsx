import React from 'react';
import { useStoreHours } from '../../hooks/useStoreHours';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const StoreStatusBanner: React.FC = () => {
  const { getStoreStatus, loading, refreshData } = useStoreHours();

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 animate-pulse">
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
      console.log('✅ Status da loja atualizado');
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