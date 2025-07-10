import React from 'react';
import { OrderStatus } from '../../types/order';
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  Package, 
  XCircle,
  AlertCircle,
  ChefHat
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendente',
          icon: Clock,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'confirmed':
        return {
          label: 'Confirmado',
          icon: CheckCircle,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'preparing':
        return {
          label: 'Em Preparo',
          icon: ChefHat,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200'
        };
      case 'out_for_delivery':
        return {
          label: 'Saiu para Entrega',
          icon: Truck,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200'
        };
      case 'ready_for_pickup':
        return {
          label: 'Pronto para Retirada',
          icon: Package,
          bgColor: 'bg-indigo-100',
          textColor: 'text-indigo-800',
          borderColor: 'border-indigo-200'
        };
      case 'delivered':
        return {
          label: 'Entregue',
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          icon: XCircle,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      default:
        return {
          label: 'Desconhecido',
          icon: AlertCircle,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border
      ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}
    `}>
      <Icon size={16} />
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;