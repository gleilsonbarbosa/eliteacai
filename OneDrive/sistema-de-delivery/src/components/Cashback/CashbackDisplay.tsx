import React from 'react';
import { Gift, Clock, TrendingUp } from 'lucide-react';
import { CustomerBalance } from '../../types/cashback';

interface CashbackDisplayProps {
  balance: CustomerBalance;
  className?: string;
}

const CashbackDisplay: React.FC<CashbackDisplayProps> = ({ balance, className = '' }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatExpirationDate = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expira hoje';
    if (diffDays === 1) return 'Expira amanhã';
    if (diffDays <= 7) return `Expira em ${diffDays} dias`;
    
    return `Expira em ${date.toLocaleDateString('pt-BR')}`;
  };

  const getExpirationColor = (dateString?: string) => {
    if (!dateString) return 'text-gray-500';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'text-red-600';
    if (diffDays <= 3) return 'text-orange-600';
    if (diffDays <= 7) return 'text-yellow-600';
    
    return 'text-green-600';
  };

  if (balance.available_balance <= 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Gift size={20} className="text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">Cashback disponível</p>
            <p className="font-semibold text-gray-800">{formatPrice(0)}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Faça pedidos e ganhe cashback para usar nas próximas compras!
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 rounded-full p-2">
            <Gift size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-green-700 font-medium">Cashback disponível</p>
            <p className="text-xl font-bold text-green-800">{formatPrice(balance.available_balance)}</p>
          </div>
        </div>
        <TrendingUp size={24} className="text-green-600" />
      </div>

      {balance.next_expiration && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-green-200">
          <Clock size={14} className={getExpirationColor(balance.next_expiration)} />
          <p className={`text-xs font-medium ${getExpirationColor(balance.next_expiration)}`}>
            {formatExpirationDate(balance.next_expiration)}
          </p>
        </div>
      )}

      {balance.expired_balance > 0 && (
        <div className="mt-2">
          <p className="text-xs text-red-600">
            {formatPrice(balance.expired_balance)} expiraram este mês
          </p>
        </div>
      )}
    </div>
  );
};

export default CashbackDisplay;