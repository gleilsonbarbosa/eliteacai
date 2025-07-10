import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types/order';
import OrderStatusBadge from './OrderStatusBadge';
import OrderChat from './OrderChat';
import OrderPrintView from './OrderPrintView';
import { 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  CreditCard,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Printer
} from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  isAttendant?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  onStatusChange, 
  isAttendant = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'money': return 'Dinheiro';
      case 'pix': return 'PIX (85989041010)';
      case 'card': return 'Cartão';
      default: return method;
    }
  };

  const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'pending', label: 'Pendente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'preparing', label: 'Em Preparo' },
    { value: 'out_for_delivery', label: 'Saiu para Entrega' },
    { value: 'ready_for_pickup', label: 'Pronto para Retirada' },
    { value: 'delivered', label: 'Entregue' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 rounded-full p-2">
                <Package size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Pedido #{order.id.slice(-8)}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <span>{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-400" />
              <span>{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <span>{order.customer_address}, {order.customer_neighborhood}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-gray-400" />
              <span>{getPaymentMethodLabel(order.payment_method)}</span>
              {order.change_for && (
                <span className="text-gray-500">
                  (Troco para {formatPrice(order.change_for)})
                </span>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-green-600">
                Total: {formatPrice(order.total_price)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrintView(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  title="Imprimir pedido"
                >
                  <Printer size={16} />
                  Imprimir
                </button>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  <MessageCircle size={16} />
                  Chat
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {isExpanded ? 'Menos' : 'Detalhes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Change (Attendant Only) */}
        {isAttendant && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alterar Status:
            </label>
            <select
              value={order.status}
              onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="p-4 border-b border-gray-100">
            <h4 className="font-medium text-gray-800 mb-3">Itens do Pedido:</h4>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-800">{item.product_name}</h5>
                      {item.selected_size && (
                        <p className="text-sm text-gray-600">{item.selected_size}</p>
                      )}
                      
                      {/* Complementos */}
                      {item.complements.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-medium text-gray-700">Complementos:</p>
                          <div className="text-xs text-gray-600">
                            {item.complements.map((comp, idx) => (
                              <span key={idx}>
                                • {comp.name}
                                {comp.price > 0 && ` (+${formatPrice(comp.price)})`}
                                {idx < item.complements.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.observations && (
                        <p className="text-sm text-gray-500 italic mt-1">
                          Obs: {item.observations}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">
                          Qtd: {item.quantity}x
                        </span>
                        <span className="font-medium text-purple-600">
                          {formatPrice(item.total_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        {showChat && (
          <div className="border-t border-gray-100">
            <OrderChat 
              orderId={order.id} 
              customerName={order.customer_name}
              isAttendant={isAttendant}
            />
          </div>
        )}
      </div>

      {/* Print View Modal */}
      {showPrintView && (
        <OrderPrintView 
          order={order} 
          onClose={() => setShowPrintView(false)} 
        />
      )}
    </>
  );
};

export default OrderCard;