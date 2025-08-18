import React, { useState } from 'react';
import { ShoppingBag, MessageCircle, Star, User } from 'lucide-react';
import { useRecommendations } from '../../hooks/useRecommendations';

interface IARecommenderProps {
  customerId?: string;
  onProductSelect?: (productId: string) => void;
}

const IARecommender: React.FC<IARecommenderProps> = ({ 
  customerId,
  onProductSelect 
}) => {
  const [showRecommender, setShowRecommender] = useState(false);
  const { getRecommendations, recommendations, loading, customerHistory } = useRecommendations();
  
  // Load recommendations when component mounts if customerId is provided
  React.useEffect(() => {
    if (customerId) {
      getRecommendations(customerId);
    } else {
      // Get popular recommendations if no customerId
      getRecommendations();
    }
  }, [customerId, getRecommendations]);

  if (!showRecommender) {
    return null;
  }

  const handleProductClick = (productId: string) => {
    if (onProductSelect) {
      onProductSelect(productId);
    }
    setShowRecommender(false);
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-green-50 border border-purple-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 rounded-full p-2 flex items-center justify-center">
            {customerHistory ? (
              <User size={20} className="text-purple-600" />
            ) : (
              <MessageCircle size={20} className="text-purple-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-purple-800">
              {customerHistory ? 'Recomendado para Você' : 'Sugestões do Dia'}
            </h2>
            {customerHistory && customerHistory.orderCount > 0 && (
              <p className="text-xs text-purple-600">
                Baseado nos seus {customerHistory.orderCount} pedidos anteriores
              </p>
            )}
          </div>
        </div>
        <button 
          onClick={() => setShowRecommender(false)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Fechar recomendações"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow text-sm text-gray-800 leading-relaxed">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Analisando suas preferências...</span>
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="space-y-4">
            <p className="text-center font-medium text-purple-800">
              {customerHistory ? 'Selecionamos estas opções especialmente para você' : 'Nossas sugestões mais populares'}
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              {recommendations.map((rec) => (
                <div 
                  key={rec.productId}
                  onClick={() => handleProductClick(rec.productId)}
                  className="bg-gradient-to-r from-purple-50 to-green-50 p-3 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {rec.imageUrl ? (
                      <img 
                        src={rec.imageUrl} 
                        alt={rec.productName} 
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=400";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ShoppingBag size={24} className="text-purple-600" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-800">{rec.productName}</h4>
                      <p className="text-xs text-gray-600">{rec.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-center text-xs text-gray-500 mt-2">
              Recomendações baseadas em {customerHistory ? 'seu histórico de pedidos' : 'nossos produtos mais populares'}
            </p>
          </div>
        ) : (
          <p className="text-center py-4 text-gray-600">Nenhuma recomendação disponível no momento.</p>
        )}
      </div>
    </div>
  );
};

export default IARecommender;