import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Package, 
  DollarSign,
  Truck, 
  ArrowLeft,
  ShoppingBag
} from 'lucide-react';
import AttendantPanel from './Orders/AttendantPanel'; 
import PDVSalesScreen from './PDV/PDVSalesScreen';
import CashRegisterMenu from './PDV/CashRegisterMenu';
import { usePermissions } from '../hooks/usePermissions';
import { useScale } from '../hooks/useScale';
import { useOrders } from '../hooks/useOrders';
import { PDVOperator } from '../types/pdv';

interface UnifiedAttendancePanelProps {
  operator?: PDVOperator;
  scaleHook?: ReturnType<typeof useScale>;
}

const UnifiedAttendancePage: React.FC<UnifiedAttendancePanelProps> = ({ operator, scaleHook }) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'orders' | 'cash'>('sales');
  const { hasPermission } = usePermissions(operator);
  const { orders } = useOrders();
  
  // Calculate pending orders count from the orders data
  const pendingOrdersCount = orders.filter(order => order.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <ShoppingBag size={24} className="text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Atendimento Unificado</h1>
                <p className="text-gray-600">Elite Açaí - Vendas, Pedidos e Caixa</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {true && (
              <button
                onClick={() => setActiveTab('sales')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'sales'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calculator size={20} />
                Vendas
              </button>
            )}
            
            {true && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 relative ${
                  activeTab === 'orders'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Truck size={20} />
                Pedidos
                {pendingOrdersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>
            )}
            
            {true && (
              <button
                onClick={() => setActiveTab('cash')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'cash'
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <DollarSign size={20} />
                Caixas
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === 'sales' && <PDVSalesScreen {...scaleHook} />}
          {activeTab === 'orders' && <AttendantPanel />}
          {activeTab === 'cash' && <CashRegisterMenu />}
        </div>
      </div>
    </div>
  );
};

export default UnifiedAttendancePage;