import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Phone, MessageCircle } from 'lucide-react';

const OrderLookup: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId.trim()) {
      alert('Por favor, digite o ID do pedido');
      return;
    }

    if (!isValidUUID(orderId.trim())) {
      alert('Por favor, digite o ID completo do pedido. O ID deve ter o formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      return;
    }

    setLoading(true);
    
    // Simular validação (em produção, você validaria no backend)
    setTimeout(() => {
      setLoading(false);
      navigate(`/pedido/${orderId.trim()}`);
    }, 1000);
  };

  const formatOrderId = (value: string) => {
    // Remove espaços e converte para minúsculo, mas mantém hífens para UUIDs
    return value.replace(/\s/g, '').toLowerCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-purple-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Package size={32} className="text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Acompanhar Pedido
          </h1>
          <p className="text-gray-600">
            Digite o ID do seu pedido para acompanhar o status
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID do Pedido *
            </label>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(formatOrderId(e.target.value))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="12345678-1234-1234-1234-123456789012"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Digite o ID completo que você recebeu por WhatsApp ou email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone (opcional)
            </label>
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="(85) 99999-9999"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Para maior segurança (opcional)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !orderId.trim()}
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
                Buscar Pedido
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Não consegue encontrar seu pedido?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/5585989041010?text=Olá! Preciso de ajuda para encontrar meu pedido"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
              <a
                href="tel:+5585989041010"
                className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <Phone size={16} />
                Ligar
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors"
          >
            ← Voltar ao Cardápio
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderLookup;