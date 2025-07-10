import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Phone, User, Search } from 'lucide-react';
import { useCashback } from '../../hooks/useCashback';
import { Customer, CustomerBalance } from '../../types/cashback';
import CashbackDisplay from '../Cashback/CashbackDisplay';
import CashbackHistory from '../Cashback/CashbackHistory';

const CustomerCashbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerBalance, setCustomerBalance] = useState<CustomerBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { getCustomerByPhone, getCustomerBalance } = useCashback();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim() || phone.length < 11) {
      setError('Digite um telefone válido (11 dígitos)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const customerData = await getCustomerByPhone(phone);
      
      if (!customerData) {
        setError('Cliente não encontrado. Faça um pedido primeiro para começar a acumular cashback!');
        setCustomer(null);
        setCustomerBalance(null);
        return;
      }

      setCustomer(customerData);
      
      const balance = await getCustomerBalance(customerData.id);
      setCustomerBalance(balance);
      
    } catch (err) {
      setError('Erro ao buscar dados do cliente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Aplica máscara (85) 99999-9999
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const getPhoneNumbers = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 rounded-full p-2">
                <Gift size={24} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Meu Cashback</h1>
                <p className="text-gray-600 text-sm">Consulte seu saldo e histórico</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Busca por telefone */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Search size={20} className="text-purple-600" />
            Consultar Cashback
          </h2>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <div className="relative">
                <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="(85) 99999-9999"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Digite o telefone usado nos seus pedidos
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || getPhoneNumbers(phone).length < 11}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Buscando...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Consultar Cashback
                </>
              )}
            </button>
          </form>
        </div>

        {/* Dados do cliente */}
        {customer && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-purple-600" />
              Dados do Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome:</p>
                <p className="font-medium text-gray-800">{customer.name || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Telefone:</p>
                <p className="font-medium text-gray-800">{phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cliente desde:</p>
                <p className="font-medium text-gray-800">
                  {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Último acesso:</p>
                <p className="font-medium text-gray-800">
                  {customer.last_login 
                    ? new Date(customer.last_login).toLocaleDateString('pt-BR')
                    : 'Nunca'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Saldo de cashback */}
        {customerBalance && (
          <CashbackDisplay balance={customerBalance} />
        )}

        {/* Histórico */}
        {customer && (
          <CashbackHistory customerId={customer.id} />
        )}

        {/* Informações sobre cashback */}
        <div className="bg-gradient-to-r from-purple-50 to-green-50 border border-purple-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <Gift size={20} />
            Como funciona o Cashback?
          </h3>
          
          <div className="space-y-3 text-sm text-purple-700">
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-600">🎁</span>
              <p><strong>Ganhe 5% de cashback</strong> em todos os seus pedidos</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-600">📅</span>
              <p><strong>Válido até o fim do mês:</strong> Use seu cashback até o último dia do mês em que foi ganho</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-600">💰</span>
              <p><strong>Use como desconto:</strong> Aplique seu cashback na finalização do pedido</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-600">🔄</span>
              <p><strong>Automático:</strong> Seu cashback é calculado e creditado automaticamente</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white/50 rounded-lg">
            <p className="text-xs text-purple-600">
              <strong>Exemplo:</strong> Em um pedido de R$ 50,00, você ganha R$ 2,50 de cashback para usar até o final do mês!
            </p>
          </div>
        </div>

        {/* Botão voltar */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={18} />
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerCashbackPage;