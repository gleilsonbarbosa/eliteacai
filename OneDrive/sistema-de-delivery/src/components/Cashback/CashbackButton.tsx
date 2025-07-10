import React, { useState } from 'react';
import { Gift, Check, X } from 'lucide-react';

interface CashbackButtonProps {
  availableBalance: number;
  onApplyCashback: (amount: number) => void;
  onRemoveCashback: () => void;
  appliedAmount: number;
  disabled?: boolean;
  maxAmount?: number;
}

const CashbackButton: React.FC<CashbackButtonProps> = ({
  availableBalance,
  onApplyCashback,
  onRemoveCashback,
  appliedAmount,
  disabled = false,
  maxAmount
}) => {
  const [showInput, setShowInput] = useState(false);
  const [inputAmount, setInputAmount] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleApplyAll = () => {
    const amount = maxAmount ? Math.min(availableBalance, maxAmount) : availableBalance;
    onApplyCashback(amount);
    setShowInput(false);
  };

  const handleApplyCustom = () => {
    const amount = parseFloat(inputAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Digite um valor válido');
      return;
    }

    const maxAllowed = maxAmount ? Math.min(availableBalance, maxAmount) : availableBalance;
    if (amount > maxAllowed) {
      alert(`Valor máximo permitido: ${formatPrice(maxAllowed)}`);
      return;
    }

    onApplyCashback(amount);
    setShowInput(false);
    setInputAmount('');
  };

  const handleRemove = () => {
    onRemoveCashback();
    setShowInput(false);
    setInputAmount('');
  };

  if (availableBalance <= 0) {
    return null;
  }

  if (appliedAmount > 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={18} className="text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Cashback aplicado
              </p>
              <p className="text-xs text-green-600">
                Desconto de {formatPrice(appliedAmount)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
            title="Remover cashback"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (showInput) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-purple-600" />
            <p className="text-sm font-medium text-purple-800">
              Usar cashback ({formatPrice(availableBalance)} disponível)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApplyAll}
              disabled={disabled}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              Usar tudo ({formatPrice(maxAmount ? Math.min(availableBalance, maxAmount) : availableBalance)})
            </button>
            <button
              onClick={() => setShowInput(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount ? Math.min(availableBalance, maxAmount) : availableBalance}
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="Valor personalizado"
              className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleApplyCustom}
              disabled={disabled || !inputAmount}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      disabled={disabled}
      className="w-full bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-300 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
    >
      <Gift size={20} />
      Usar Cashback ({formatPrice(availableBalance)})
    </button>
  );
};

export default CashbackButton;