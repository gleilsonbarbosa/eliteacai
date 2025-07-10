import React from 'react';
import { ShoppingBag, Search, Gift } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-purple-600 to-green-500 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ShoppingBag size={48} className="text-white" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Elite Açaí
            </h1>
          </div>
          <p className="text-xl md:text-2xl font-light mb-6">
            Monte seu Açaí e receba rapidinho!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#cardapio"
              className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 backdrop-blur-sm border border-white/30"
            >
              Ver Cardápio
            </a>
            <a
              href="/buscar-pedido"
              className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 backdrop-blur-sm border border-white/30 flex items-center justify-center gap-2"
            >
              <Search size={20} />
              Acompanhar Pedido
            </a>
            <a
              href="/meu-cashback"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Gift size={20} />
              Meu Cashback
            </a>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-400/20 to-transparent rounded-full"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-green-400/20 to-transparent rounded-full"></div>
      </div>
    </header>
  );
};

export default Header;