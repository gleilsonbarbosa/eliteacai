import React, { useState, useEffect } from 'react';
import { useCashback } from '../../hooks/useCashback';
import { CashbackTransaction } from '../../types/cashback';
import { TrendingUp, TrendingDown, Clock, Gift, AlertCircle } from 'lucide-react';

interface CashbackHistoryProps {
  customerId: string;
}

const CashbackHistory: React.FC<CashbackHistoryProps> = ({ customerId }) => {
  const [transactions, setTransactions] = useState<CashbackTransaction[]>([]);
  const { getCustomerTransactions, loading } = useCashback();

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await getCustomerTransactions(customerId);
        setTransactions(data);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      }
    };

    if (customerId) {
      loadTransactions();
    }
  }, [customerId, getCustomerTransactions]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return <Clock size={16} className="text-yellow-600" />;
    if (status === 'rejected') return <AlertCircle size={16} className="text-red-600" />;
    
    switch (type) {
      case 'purchase':
        return <TrendingUp size={16} className="text-green-600" />;
      case 'redemption':
        return <TrendingDown size={16} className="text-red-600" />;
      default:
        return <Gift size={16} className="text-purple-600" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Cashback ganho';
      case 'redemption':
        return 'Cashback usado';
      case 'adjustment':
        return 'Ajuste';
      default:
        return 'Transação';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'pending':
        return 'Pendente';
      case 'rejected':
        return 'Rejeitado';
      case 'used':
        return 'Usado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      case 'used':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Gift size={20} className="text-purple-600" />
        Histórico de Cashback
      </h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <Gift size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma transação de cashback ainda</p>
          <p className="text-gray-400 text-sm">Faça pedidos para começar a acumular cashback!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isExpired(transaction.expires_at) ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex-shrink-0">
                {getTransactionIcon(transaction.type, transaction.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-800 text-sm">
                    {getTransactionLabel(transaction.type)}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getStatusColor(transaction.status)}`}>
                    {getStatusLabel(transaction.status)}
                  </span>
                </div>
                
                <p className="text-xs text-gray-600">
                  {formatDate(transaction.created_at)}
                </p>
                
                {transaction.comment && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {transaction.comment}
                  </p>
                )}
                
                {transaction.expires_at && (
                  <p className={`text-xs mt-1 ${
                    isExpired(transaction.expires_at) ? 'text-red-600 font-medium' : 'text-gray-500'
                  }`}>
                    {isExpired(transaction.expires_at) 
                      ? '⚠️ Expirado' 
                      : `Expira em ${new Date(transaction.expires_at).toLocaleDateString('pt-BR')}`
                    }
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.type === 'purchase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'purchase' ? '+' : '-'}{formatPrice(Math.abs(transaction.cashback_amount))}
                </p>
                <p className="text-xs text-gray-500">
                  Pedido: {formatPrice(transaction.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CashbackHistory;