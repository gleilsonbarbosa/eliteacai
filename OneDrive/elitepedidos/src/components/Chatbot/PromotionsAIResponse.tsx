import React from 'react';
import { Tag, Clock, Calendar } from 'lucide-react';
import { isQuintaElite, getTodaySpecialMessage } from '../../utils/availability';

const PromotionsAIResponse: React.FC = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const isQuintaEliteDay = isQuintaElite();
  
  return (
    <div className="bg-gradient-to-r from-purple-50 to-green-50 p-4 rounded-xl shadow-sm border border-purple-100 text-sm text-gray-800 leading-relaxed space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="text-purple-600" size={18} />
        <h3 className="font-bold text-purple-800">{isQuintaEliteDay ? '⚡ QUINTA ELITE ⚡' : 'Promoções Ativas Hoje!'}</h3>
      </div>
      
      {isQuintaEliteDay ? (
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="font-bold text-yellow-800 flex items-center gap-1 mb-2">
            <span className="text-yellow-500">🔥</span> {getTodaySpecialMessage()} <span className="text-yellow-500">🔥</span>
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 font-bold">🔥</span>
              <div>
                <span className="font-medium">Açaí 1kg por apenas R$ 37,99</span>
                <p className="text-xs text-gray-600">Economize R$ 7,00! Inclui 2 cremes e 3 mix.</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 font-bold">🔥</span>
              <div>
                <span className="font-medium">Açaí 700g por R$ 27,50</span>
                <p className="text-xs text-gray-600">Economize R$ 4,00! Inclui 2 cremes e 5 mix.</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 font-bold">🔥</span>
              <div>
                <span className="font-medium">Açaí 600g por R$ 23,99</span>
                <p className="text-xs text-gray-600">Economize R$ 3,00! Inclui 2 cremes e 3 mix.</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 font-bold">🔥</span>
              <div>
                <span className="font-medium">Açaí 400g por R$ 16,99</span>
                <p className="text-xs text-gray-600">Economize R$ 2,00! Inclui 2 cremes e 3 mix.</p>
              </div>
            </li>
          </ul>
          <p className="text-xs text-yellow-700 mt-2 flex items-center gap-1">
            <Clock size={12} /> Promoção válida apenas hoje!
            <a href="#cardapio" className="ml-2 text-purple-600 underline font-medium">Ver no cardápio</a>
          </p>
        </div>
      ) : dayOfWeek === 1 ? (
        // Segunda-feira
        <div className="space-y-2">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="font-medium text-blue-800">Promoção de Segunda-feira</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Copo 300ml sem peso por R$ 9,99</span>
                  <p className="text-xs text-gray-600">Açaí + 1 creme + 2 mix</p>
                </div>
              </li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">
              <a href="#cardapio" className="text-purple-600 underline font-medium">Ver no cardápio</a>
            </p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="font-medium text-purple-800">Promoções Diárias</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Combo Casal por R$ 49,99</span>
                  <p className="text-xs text-gray-600">1kg de açaí + milkshake 300ml</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      ) : dayOfWeek === 2 || dayOfWeek === 5 ? (
        // Terça ou Sexta
        <div className="space-y-2">
          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
            <p className="font-medium text-green-800">Promoção de {dayOfWeek === 2 ? 'Terça' : 'Sexta'}-feira</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Copo 500ml sem peso por R$ 14,99</span>
                  <p className="text-xs text-gray-600">Açaí + 2 cremes + 3 mix</p>
                </div>
              </li>
            </ul>
            <p className="text-xs text-green-700 mt-2">
              <a href="#cardapio" className="text-purple-600 underline font-medium">Ver no cardápio</a>
            </p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="font-medium text-purple-800">Promoções Diárias</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Combo Casal por R$ 49,99</span>
                  <p className="text-xs text-gray-600">1kg de açaí + milkshake 300ml</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      ) : dayOfWeek === 3 ? (
        // Quarta-feira
        <div className="space-y-2">
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
            <p className="font-medium text-indigo-800">Promoção de Quarta-feira</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Copo 400ml sem peso por R$ 12,99</span>
                  <p className="text-xs text-gray-600">Açaí + 2 cremes + 3 mix</p>
                </div>
              </li>
            </ul>
            <p className="text-xs text-indigo-700 mt-2">
              <a href="#cardapio" className="text-purple-600 underline font-medium">Ver no cardápio</a>
            </p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="font-medium text-purple-800">Promoções Diárias</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Combo Casal por R$ 49,99</span>
                  <p className="text-xs text-gray-600">1kg de açaí + milkshake 300ml</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        // Outros dias (Sábado e Domingo)
        <div className="space-y-2">
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="font-medium text-purple-800">Promoções Diárias</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Combo Casal por R$ 49,99</span>
                  <p className="text-xs text-gray-600">1kg de açaí + milkshake 300ml</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">🔥</span>
                <div>
                  <span className="font-medium">Combo 4 (900g) por R$ 42,99</span>
                  <p className="text-xs text-gray-600">600g de açaí + 300g de creme + 5 mix</p>
                </div>
              </li>
            </ul>
            <p className="text-xs text-purple-700 mt-2">
              <a href="#cardapio" className="text-purple-600 underline font-medium">Ver no cardápio</a>
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={12} />
          <span>Atualizado hoje</span>
        </div>
        <a href="#cardapio" className="text-xs text-purple-600 hover:text-purple-800 font-medium">
          Ver cardápio completo
        </a>
      </div>
    </div>
  );
};

export default PromotionsAIResponse;