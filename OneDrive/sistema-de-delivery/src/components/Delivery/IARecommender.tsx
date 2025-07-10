import React, { useState } from 'react';
import { ShoppingBag, MessageCircle, Star } from 'lucide-react';

const IARecommender: React.FC = () => {
  const [showRecommender, setShowRecommender] = useState(true);

  if (!showRecommender) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-green-50 border border-purple-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 rounded-full p-2">
            <MessageCircle size={20} className="text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-purple-800">Assistente Elite Açaí</h2>
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
      
      <div className="bg-white p-4 rounded-xl shadow text-sm text-gray-800 leading-relaxed space-y-3">
        <p>👋 <strong>Olá! Seja bem-vindo(a) ao Elite Açaí!</strong></p>
        <p>Posso te ajudar com:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>🍓 Cardápio:</strong> Açaís, combos, milkshakes, vitaminas e muito mais.</li>
          <li><strong>🔥 Promoções:</strong> Temos ofertas especiais que valem a pena conferir!</li>
          <li><strong>💳 Pagamentos:</strong> Aceitamos Pix, cartão, dinheiro e vale-refeição.</li>
          <li><strong>🚚 Entrega:</strong> Retire na loja ou receba no conforto da sua casa.</li>
        </ul>
        <p>🛒 <strong>Quer fazer um pedido?</strong> Me diga o que você deseja ou escolha uma das sugestões abaixo:</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <a href="#cardapio" className="bg-purple-50 p-3 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors no-underline">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-purple-600" />
              <span className="font-medium text-purple-800">Açaí 400g</span>
            </div>
            <p className="text-xs text-gray-600">2 cremes + 3 complementos à sua escolha</p>
          </a>
          
          <a href="#cardapio" className="bg-green-50 p-3 rounded-lg border border-green-100 hover:bg-green-100 transition-colors no-underline">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-green-600" />
              <span className="font-medium text-green-800">Combo Casal</span>
            </div>
            <p className="text-xs text-gray-600">1kg de açaí + milkshake 300ml</p>
          </a>
          
          <a href="#cardapio" className="bg-blue-50 p-3 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors no-underline">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-blue-600" />
              <span className="font-medium text-blue-800">Milkshake 500ml</span>
            </div>
            <p className="text-xs text-gray-600">Sabores: chocolate, morango, ovomaltine</p>
          </a>
          
          <a href="#cardapio" className="bg-amber-50 p-3 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors no-underline">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-amber-600" />
              <span className="font-medium text-amber-800">Vitamina de Açaí</span>
            </div>
            <p className="text-xs text-gray-600">Nutritiva e refrescante, 400ml ou 500ml</p>
          </a>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-green-50 p-3 rounded-lg mt-2">
          <p className="text-center text-sm font-medium text-purple-800">
            Estou aqui pra deixar seu pedido do jeitinho que você gosta! 😋
          </p>
          <p className="text-center text-xs text-gray-600 mt-1">
            Clique no botão de chat no canto da tela para conversar comigo
          </p>
        </div>
      </div>
    </div>
  );
};

export default IARecommender;