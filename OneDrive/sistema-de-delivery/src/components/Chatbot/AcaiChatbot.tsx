import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, ChevronDown, ChevronUp, ShoppingBag, MessageCircle } from 'lucide-react';
import { products, categoryNames } from '../../data/products';
import { isProductAvailable } from '../../utils/availability';
import { useStoreHours } from '../../hooks/useStoreHours';
import { useOrders } from '../../hooks/useOrders';
import { useNeighborhoods } from '../../hooks/useNeighborhoods';
import { useCashback } from '../../hooks/useCashback';
import PromotionsAIResponse from './PromotionsAIResponse';

// Helper functions for promotions
const getPromotionsOfTheDay = (availableProducts: any[]) => {
  // Filter products that have promotional pricing or special offers
  return availableProducts.filter(product => {
    // Check if it's a promotional item (you can customize this logic)
    return product.isPromotion || product.originalPrice > product.price;
  });
};

const isQuintaElite = () => {
  // Check if today is Thursday (quinta-feira)
  const today = new Date();
  return today.getDay() === 4; // Thursday is day 4 (0 = Sunday, 1 = Monday, etc.)
};

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

const AcaiChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hooks for system integration
  const { getStoreStatus } = useStoreHours();
  const { orders, loading: ordersLoading } = useOrders();
  const { neighborhoods } = useNeighborhoods();
  const { getCustomerByPhone, getCustomerBalance } = useCashback();

  // Initial greeting when the chatbot is first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialGreeting = getInitialGreeting();
      setMessages([
        {
          id: Date.now().toString(),
          text: initialGreeting,
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat is opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Try to get customer phone from localStorage
  useEffect(() => {
    const storedPhone = localStorage.getItem('customer_phone');
    if (storedPhone) {
      setCustomerPhone(storedPhone);
    }
  }, []);

  // Try to get last order ID from localStorage
  useEffect(() => {
    const storedOrderId = localStorage.getItem('last_order_id');
    if (storedOrderId) {
      setLastOrderId(storedOrderId);
    }
  }, []);

  const getInitialGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    let greeting = '';

    if (hour < 12) {
      greeting = 'Bom dia';
    } else if (hour < 18) {
      greeting = 'Boa tarde';
    } else {
      greeting = 'Boa noite';
    }

    // Check if there are promotions today
    const availableProducts = products.filter(p => isProductAvailable(p));
    const promotions = getPromotionsOfTheDay(availableProducts);
    const isQuintaEliteDay = isQuintaElite();

    let promotionText = '';
    if (promotions.length > 0) {
      if (isQuintaEliteDay) {
        promotionText = `\n\n🔥 Hoje é QUINTA ELITE! Temos promoções especiais como açaí de 1kg por apenas R$ 37,99!`;
      } else {
        promotionText = `\n\nTemos ${promotions.length} promoções especiais hoje! 🔥`;
      }
    }

    return `${greeting}! 👋 Sou o assistente virtual da Elite Açaí. Como posso ajudar você hoje? Posso dar informações sobre nosso cardápio, promoções ou ajudar a montar seu pedido.${promotionText}`;
  };

  // Function to check if the store is open
  const isStoreOpen = () => {
    const storeStatus = getStoreStatus();
    return storeStatus.isOpen;
  };

  // Function to get the last order status
  const getLastOrderStatus = () => {
    if (!lastOrderId) return null;
    
    const order = orders.find(o => o.id === lastOrderId);
    return order;
  };

  // Function to check if a neighborhood is in delivery area
  const isInDeliveryArea = (neighborhood: string) => {
    return neighborhoods.some(n => 
      n.name.toLowerCase().includes(neighborhood.toLowerCase()) && n.is_active
    );
  };

  // Function to get delivery fee for a neighborhood
  const getDeliveryFee = (neighborhood: string) => {
    const found = neighborhoods.find(n => 
      n.name.toLowerCase().includes(neighborhood.toLowerCase()) && n.is_active
    );
    return found ? found.delivery_fee : null;
  };

  // Function to get customer cashback balance
  const getCustomerCashback = async (phone: string) => {
    try {
      const customer = await getCustomerByPhone(phone);
      if (!customer) return null;
      
      const balance = await getCustomerBalance(customer.id);
      return balance;
    } catch (error) {
      console.error('Erro ao buscar saldo de cashback:', error);
      return null;
    }
  };

  // Function to get product price
  const getProductPrice = (productName: string) => {
    const product = products.find(p => 
      p.name.toLowerCase().includes(productName.toLowerCase()) && 
      isProductAvailable(p)
    );
    
    return product ? product.price : null;
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Show typing indicator
    setIsTyping(true);

    // Generate bot response with a realistic delay
    const responseTime = Math.max(500, Math.min(input.length * 30, 2000));
    
    setTimeout(() => {
      const botResponse = generateResponse(input);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, responseTime);
  };

  // Enhanced response generation with system integration
  const generateResponse = (userInput: string) => {
    const input = userInput.toLowerCase();

    // Check for greetings
    if (input.match(/^(oi|olá|ola|e aí|eai|boa tarde|bom dia|boa noite|hey)/i)) {
      return "Olá! Como posso ajudar você hoje? Gostaria de conhecer nossas promoções ou fazer um pedido?";
    }

    // Check for order intent
    if (input.includes("fazer pedido") || input.includes("quero pedir") || input.includes("quero fazer um pedido")) {
      return "Claro! Você gostaria de um açaí por peso, copo promocional ou algum combo? Temos várias opções deliciosas no nosso cardápio!";
    }
    
    // 1. Status do pedido
    if (input.includes("meu pedido") && (input.includes("saiu") || input.includes("status") || input.includes("onde está"))) {
      const lastOrder = getLastOrderStatus();
      
      if (!lastOrder) {
        return "Não encontrei nenhum pedido recente associado ao seu cadastro. Se você fez um pedido recentemente, pode me informar o número do pedido?";
      }
      
      const statusMessages = {
        pending: "Seu pedido foi recebido e está aguardando confirmação.",
        confirmed: "Seu pedido foi confirmado e entrará em preparo em breve.",
        preparing: "Seu pedido está sendo preparado com todo carinho pela nossa equipe.",
        out_for_delivery: "Boa notícia! Seu pedido já saiu para entrega e está a caminho.",
        ready_for_pickup: "Seu pedido está pronto para retirada na loja!",
        delivered: "Seu pedido já foi entregue. Esperamos que tenha gostado!",
        cancelled: "Seu pedido foi cancelado."
      };
      
      return `${statusMessages[lastOrder.status] || "Seu pedido está sendo processado."} Você pode acompanhar todos os detalhes do seu pedido através do link: ${window.location.origin}/pedido/${lastOrder.id}`;
    }
    
    // 2. Tempo estimado de entrega
    if (input.includes("chega") && input.includes("tempo") || input.includes("demorar") || input.includes("demora")) {
      const lastOrder = getLastOrderStatus();
      
      if (!lastOrder) {
        return "O tempo médio de entrega é de 35 a 50 minutos, dependendo do seu bairro. Se você já fez um pedido e quer saber o tempo estimado, pode me informar o número do pedido?";
      }
      
      if (lastOrder.estimated_delivery_minutes) {
        return `Seu pedido tem previsão de entrega em aproximadamente ${lastOrder.estimated_delivery_minutes} minutos a partir do momento da confirmação.`;
      } else {
        return "O tempo médio de entrega é de 35 a 50 minutos, dependendo do seu bairro. Seu pedido está sendo processado e logo estará a caminho!";
      }
    }
    
    // 3. Verificar se a loja está aberta
    if (input.includes("aberto") || input.includes("fechado") || input.includes("funcionando") || 
        (input.includes("loja") && input.includes("aberta"))) {
      const storeStatus = getStoreStatus();
      
      if (storeStatus.isOpen) {
        return `✅ Sim, estamos abertos agora! ${storeStatus.message} Pode fazer seu pedido à vontade.`;
      } else {
        return `❌ No momento estamos fechados. ${storeStatus.message} Aguardamos seu pedido quando estivermos abertos!`;
      }
    }
    
    // 4. Resumo do pedido
    if (input.includes("resumo") || input.includes("nota") || input.includes("comprovante") || input.includes("segunda via")) {
      const lastOrder = getLastOrderStatus();
      
      if (!lastOrder) {
        return "Não encontrei nenhum pedido recente para gerar o resumo. Você pode me informar o número do pedido?";
      }
      
      let resumo = `📋 **Resumo do Pedido #${lastOrder.id.slice(-8)}**\n\n`;
      resumo += `📅 Data: ${new Date(lastOrder.created_at).toLocaleDateString('pt-BR')}\n`;
      resumo += `⏰ Hora: ${new Date(lastOrder.created_at).toLocaleTimeString('pt-BR')}\n`;
      resumo += `📍 Endereço: ${lastOrder.customer_address}, ${lastOrder.customer_neighborhood}\n`;
      resumo += `💰 Total: R$ ${lastOrder.total_price.toFixed(2)}\n\n`;
      resumo += `🔗 Para ver todos os detalhes, acesse: ${window.location.origin}/pedido/${lastOrder.id}`;
      
      return resumo;
    }
    
    // 5. Formas de pagamento
    if (input.includes("forma") && input.includes("pagamento") || 
        input.includes("pix") || input.includes("cartão") || input.includes("cartao") || 
        input.includes("dinheiro") || input.includes("débito") || input.includes("debito") || 
        input.includes("crédito") || input.includes("credito")) {
      
      return "Aceitamos diversas formas de pagamento:\n\n- Dinheiro (com troco)\n- Cartão de crédito ou débito\n- PIX (chave: 85989041010)\n\nQual seria sua forma de pagamento preferida?";
    }
    
    // 6. Encaminhar para atendimento humano
    if (input.includes("falar com alguém") || input.includes("falar com atendente") || 
        input.includes("atendimento humano") || input.includes("pessoa real") || 
        input.includes("suporte") || input.includes("reclamação") || input.includes("reclamacao")) {
      
      return "Entendo que você precisa de atendimento personalizado. Vou encaminhar você para um de nossos atendentes. Por favor, entre em contato pelo WhatsApp: (85) 98904-1010 ou clique no botão de WhatsApp no canto da tela. Um atendente responderá o mais breve possível.";
    }
    
    // 7. Preferências do cliente
    if (input.includes("de sempre") || input.includes("o mesmo") || input.includes("como da última vez")) {
      const lastOrder = getLastOrderStatus();
      
      if (!lastOrder) {
        return "Não encontrei pedidos anteriores no seu histórico. Gostaria de fazer um novo pedido? Posso te ajudar a escolher algo delicioso!";
      }
      
      let itemsText = "";
      if (lastOrder.items && lastOrder.items.length > 0) {
        itemsText = lastOrder.items.map(item => 
          `${item.quantity}x ${item.product_name}${item.selected_size ? ` (${item.selected_size})` : ''}`
        ).join(", ");
      }
      
      return `Seu último pedido foi: ${itemsText}. Gostaria de repetir este pedido? Posso adicionar ao carrinho para você.`;
    }
    
    // 8. Área de entrega
    if ((input.includes("entrega") || input.includes("entregam")) && 
        (input.includes("bairro") || input.includes("onde") || input.includes("região") || input.includes("area"))) {
      
      // Extract neighborhood name if present
      const words = input.split(' ');
      const neighborhoodIndex = words.findIndex(word => 
        word === "bairro" || word === "no" || word === "em"
      );
      
      if (neighborhoodIndex >= 0 && neighborhoodIndex < words.length - 1) {
        const possibleNeighborhood = words[neighborhoodIndex + 1];
        
        if (isInDeliveryArea(possibleNeighborhood)) {
          const fee = getDeliveryFee(possibleNeighborhood);
          return `Sim, entregamos no bairro ${possibleNeighborhood}! A taxa de entrega é de R$ ${fee?.toFixed(2)}. Gostaria de fazer um pedido?`;
        } else {
          return `Infelizmente não entregamos no bairro ${possibleNeighborhood} no momento. Mas temos várias outras regiões atendidas! Você pode também retirar seu pedido em uma de nossas lojas.`;
        }
      }
      
      return "Entregamos em diversos bairros de Fortaleza! A taxa de entrega varia de R$ 3,00 a R$ 8,00, dependendo da sua localização. Qual seu bairro para que eu possa verificar se atendemos e informar a taxa exata?";
    }
    
    // 9. Preços
    if (input.includes("preço") || input.includes("preco") || input.includes("valor") || input.includes("custa") || input.includes("quanto")) {
      // Try to extract product name
      const productKeywords = [
        { keyword: "açaí", product: "açaí" },
        { keyword: "acai", product: "açaí" },
        { keyword: "combo", product: "combo" },
        { keyword: "milk", product: "milkshake" },
        { keyword: "shake", product: "milkshake" },
        { keyword: "vitamina", product: "vitamina" },
        { keyword: "300", product: "300g" },
        { keyword: "500", product: "500g" },
        { keyword: "700", product: "700g" },
        { keyword: "1kg", product: "1kg" },
        { keyword: "1 kg", product: "1kg" },
      ];
      
      const foundKeyword = productKeywords.find(k => input.includes(k.keyword));
      
      if (foundKeyword) {
        const price = getProductPrice(foundKeyword.product);
        if (price) {
          return `O preço do ${foundKeyword.product} é R$ ${price.toFixed(2)}. Gostaria de adicionar ao seu pedido?`;
        }
      }
      
      return "Temos diversas opções com preços variados:\n\n- Açaí 300g: R$ 13,99\n- Açaí 400g: R$ 18,99\n- Açaí 500g: R$ 22,99\n- Açaí 600g: R$ 26,99\n- Açaí 700g: R$ 31,99\n- Açaí 800g: R$ 34,99\n- Açaí 900g: R$ 38,99\n- Açaí 1kg: R$ 44,99\n\nHá algum tamanho específico que você gostaria de saber o preço?";
    }
    
    // 10. Promoções ativas
    if (input.includes("promoção") || input.includes("promocao") || input.includes("oferta") || input.includes("desconto")) {
      const availableProducts = products.filter(p => isProductAvailable(p));
      // Return special string to trigger rendering the PromotionsAIResponse component
      return '<PromotionsAIResponse />';
    }
    
    // Cashback balance
    if (input.includes("saldo") || input.includes("cashback") || input.includes("pontos") || input.includes("crédito") || input.includes("credito")) {
      if (!customerPhone) {
        return "Para consultar seu saldo de cashback, preciso do seu número de telefone cadastrado. Pode me informar, por favor? (Digite apenas os números, ex: 85999998888)";
      }
      
      // This would be an async operation in a real implementation
      return "🎁 **Saldo de Cashback**\n\nVocê possui R$ 12,50 em cashback disponível para uso até 31/07/2024.\n\nPara usar seu cashback, basta selecionar a opção na finalização do seu próximo pedido. A cada compra você acumula 5% do valor em cashback!";
    }

    // Check for greetings
    if (input.match(/^(oi|olá|ola|e aí|eai|boa tarde|bom dia|boa noite|hey)/i)) {
      return "Olá! Como posso ajudar você hoje? Gostaria de conhecer nossas promoções ou fazer um pedido?";
    }

    // Check for order intent
    if (input.includes("fazer pedido") || input.includes("quero pedir") || input.includes("quero fazer um pedido")) {
      return "Claro! Você gostaria de um açaí por peso, copo promocional ou algum combo? Temos várias opções deliciosas no nosso cardápio!";
    }

    // Check for promotions
    if (input.includes("promo") || input.includes("promoção") || input.includes("promocao") || input.includes("oferta") || input.includes("desconto")) {
      const availableProducts = products.filter(p => isProductAvailable(p));
      // Return special string to trigger rendering the PromotionsAIResponse component
      return '<PromotionsAIResponse />';
    }

    // Check for menu questions
    if (input.includes("cardápio") || input.includes("cardapio") || input.includes("menu") || input.includes("opções") || input.includes("opcoes")) {
      const categories = Object.values(categoryNames).join(', ');
      return `Nosso cardápio inclui: ${categories}. Temos diversas opções de tamanhos e complementos. <a href="#cardapio" class="text-purple-600 underline font-medium">Clique aqui para ver o cardápio completo</a> ou me diga se gostaria de saber mais sobre alguma categoria específica.`;
    }

    // Check for açaí questions
    if (input.includes("açaí") || input.includes("acai")) {
      if (input.includes("tamanho") || input.includes("tamanhos") || input.includes("opções") || input.includes("opcoes")) {
        return "Temos açaí nos seguintes tamanhos:\n\n- 300g: R$ 13,99\n- 400g: R$ 18,99\n- 500g: R$ 22,99\n- 600g: R$ 26,99\n- 700g: R$ 31,99\n- 800g: R$ 34,99\n- 900g: R$ 38,99\n- 1kg: R$ 44,99\n\nTodos vêm com direito a 2 cremes e 3 complementos à sua escolha!";
      }
      
      if (input.includes("complemento") || input.includes("complementos") || input.includes("acompanhamento")) {
        return "Nossos complementos incluem: granola, leite em pó, leite condensado, paçoca, chocolate, morango, banana, castanha, cereja, kiwi, uva, e muito mais! Você pode escolher até 3 complementos grátis em cada açaí.";
      }
      
      if (input.includes("creme") || input.includes("cremes")) {
        return "Temos diversos cremes deliciosos: cupuaçu, morango, ninho, nutela, maracujá, paçoca, ovomaltine, coco, morangotela e pistache. Você pode escolher até 2 cremes em cada açaí!";
      }
      
      return "Nosso açaí é premium, com sabor e textura incomparáveis! Temos diversos tamanhos, de 300g até 1kg. Cada porção vem com direito a 2 cremes e 3 complementos à sua escolha. Gostaria de conhecer os tamanhos disponíveis ou os complementos?";
    }

    // Check for combo questions
    if (input.includes("combo") || input.includes("combos")) {
      if (input.includes("casal")) {
        return "O Combo Casal inclui 1kg de açaí + 1 milkshake de 300g por apenas R$ 49,99! É perfeito para compartilhar e você pode escolher o sabor do milkshake. <a href=\"#cardapio\" class=\"text-purple-600 underline font-medium\">Veja no cardápio</a> ou me diga se gostaria de fazer um pedido.";
      }
      
      return "Temos diversos combos:\n\n- Combo 1 (400g): 300g de açaí + 100g de creme + 4 mix por R$ 23,99\n- Combo 2 (500g): 300g de açaí + 200g de creme + 4 mix por R$ 26,99\n- Combo 3 (600g): 400g de açaí + 200g de creme + 5 mix por R$ 31,99\n- Combo 4 (900g): 600g de açaí + 300g de creme + 5 mix por R$ 42,99\n- Combo Casal: 1kg de açaí + milkshake 300g por R$ 49,99\n\n<a href=\"#cardapio\" class=\"text-purple-600 underline font-medium\">Ver no cardápio</a> ou me diga se gostaria de pedir algum desses combos.";
    }

    // Check for milkshake questions
    if (input.includes("milkshake") || input.includes("milk shake") || input.includes("shake")) {
      if (input.includes("sabor") || input.includes("sabores")) {
        return "Temos milkshakes nos sabores: morango, chocolate, baunilha e ovomaltine. Todos super cremosos e deliciosos!";
      }
      
      if (input.includes("tamanho") || input.includes("tamanhos")) {
        return "Nossos milkshakes estão disponíveis em dois tamanhos:\n- 400ml: R$ 11,99\n- 500ml: R$ 12,99\n\n<a href=\"#cardapio\" class=\"text-purple-600 underline font-medium\">Ver no cardápio</a>";
      }
      
      return "Nossos milkshakes são super cremosos e deliciosos! Temos nos sabores morango, chocolate, baunilha e ovomaltine, nos tamanhos 400ml (R$ 11,99) e 500ml (R$ 12,99). <a href=\"#cardapio\" class=\"text-purple-600 underline font-medium\">Ver no cardápio</a> ou me diga se gostaria de pedir um.";
    }

    // Check for vitamina questions
    if (input.includes("vitamina")) {
      return "Nossas vitaminas de açaí são nutritivas e deliciosas! Temos nos tamanhos:\n- 400ml: R$ 12,00\n- 500ml: R$ 15,00\n\nCada vitamina vem com açaí, leite em pó e você pode escolher até 2 complementos sem custo adicional, como granola, castanha, mel e outros. <a href=\"#cardapio\" class=\"text-purple-600 underline font-medium\">Ver no cardápio</a>";
    }

    // Check for delivery questions
    if (input.includes("entrega") || input.includes("delivery") || input.includes("taxa") || input.includes("frete")) {
      return "Fazemos entrega em diversos bairros! A taxa de entrega varia de R$ 3,00 a R$ 8,00, dependendo da sua localização. O tempo médio de entrega é de 35 a 50 minutos. Qual seu bairro para que eu possa informar a taxa exata?";
    }

    // Check for payment questions
    if (input.includes("pagamento") || input.includes("pagar") || input.includes("dinheiro") || input.includes("cartão") || input.includes("cartao") || input.includes("pix")) {
      return "Aceitamos diversas formas de pagamento:\n- Dinheiro (com troco)\n- Cartão de crédito ou débito\n- PIX (chave: 85989041010)\n\nQual seria sua forma de pagamento preferida?";
    }

    // Check for store hours
    if (input.includes("horário") || input.includes("horario") || input.includes("funcionamento") || input.includes("aberto") || input.includes("fechado")) {
      return "Nossos horários de funcionamento:\n\n🏡 Loja 1 (Rua Dois, 2130‑A – Cágado)\n🕐 Aberta das 17h às 23h\n\n🏡 Loja 2 (Rua Um, 1614‑C – Residencial 1)\n🕐 Aberta das 16h às 23h";
    }

    // Check for contact information
    if (input.includes("contato") || input.includes("telefone") || input.includes("whatsapp") || input.includes("falar") || input.includes("atendente")) {
      return "Você pode entrar em contato conosco pelo telefone ou WhatsApp: (85) 98904-1010. Teremos prazer em atendê-lo!";
    }

    // Check for location
    if (input.includes("endereço") || input.includes("endereco") || input.includes("localização") || input.includes("localizacao") || input.includes("onde fica")) {
      return "Temos duas lojas:\n\n🏡 Loja 1: Rua Dois, 2130‑A – Cágado\n\n🏡 Loja 2: Rua Um, 1614‑C – Residencial 1\n\nAmbas com serviço de delivery!";
    }

    // Check for thank you
    if (input.includes("obrigado") || input.includes("obrigada") || input.includes("valeu") || input.includes("agradecido") || input.includes("agradecida")) {
      return "Por nada! Estou aqui para ajudar. Precisa de mais alguma informação sobre nossos produtos ou serviços?";
    }

    // Check for goodbye
    if (input.includes("tchau") || input.includes("adeus") || input.includes("até mais") || input.includes("até logo") || input.includes("até amanhã")) {
      return "Até mais! Obrigado por conversar comigo. Quando quiser fazer um pedido ou tiver dúvidas, estarei aqui para ajudar. Tenha um ótimo dia!";
    }
    
    // Recomendações inteligentes
    if (input.includes("não sei o que pedir") || input.includes("me recomenda") || input.includes("sugestão") || 
        input.includes("sugestao") || input.includes("recomendação") || input.includes("recomendacao") || 
        input.includes("o que você recomenda") || input.includes("o que voce recomenda")) {
      
      return "Posso te ajudar a escolher algo delicioso! Você prefere algo:\n\n1. Mais doce e cremoso\n2. Mais refrescante e leve\n3. Mais energético e nutritivo\n4. Um combo para compartilhar\n\nMe diga sua preferência e te farei uma recomendação personalizada!";
    }
    
    // Responder às preferências para recomendações
    if (input.includes("doce") || input.includes("cremoso")) {
      return "Para quem gosta de algo bem doce e cremoso, recomendo nosso Açaí 500g com creme de Nutella e leite condensado, complementado com morango e granola. É uma explosão de sabor! Gostaria de adicionar ao seu pedido?";
    }
    
    if (input.includes("refrescante") || input.includes("leve")) {
      return "Para uma opção mais leve e refrescante, recomendo nossa Vitamina de Açaí 400ml com granola e banana. É perfeita para dias quentes e não é tão calórica! Gostaria de experimentar?";
    }
    
    if (input.includes("energético") || input.includes("nutritivo") || input.includes("energia")) {
      return "Para mais energia e nutrição, nosso Açaí 700g com granola, banana, castanha e guaraná em pó é imbatível! Perfeito antes ou depois de atividades físicas. Quer adicionar ao seu pedido?";
    }
    
    if (input.includes("combo") || input.includes("compartilhar") || input.includes("casal")) {
      return "Nosso Combo Casal é perfeito para compartilhar! Inclui 1kg de açaí + 1 milkshake de 300ml por apenas R$ 49,99. É uma excelente opção para duas pessoas! Gostaria de pedir?";
    }
    
    // Pós-venda (simulação - em um caso real seria acionado pelo status do pedido)
    if (input.includes("sim") && messages.some(m => m.text.includes("bem atendido hoje"))) {
      return "Que ótimo! Ficamos muito felizes em saber que você teve uma boa experiência. Seu feedback é muito importante para nós. Esperamos atendê-lo novamente em breve! 😊";
    }
    
    if (input.includes("não") && messages.some(m => m.text.includes("bem atendido hoje"))) {
      return "Lamentamos muito por não termos atendido suas expectativas. Gostaríamos de entender melhor o que aconteceu para melhorarmos nosso serviço. Por favor, entre em contato com nosso atendimento pelo WhatsApp (85) 98904-1010 para que possamos resolver sua questão da melhor forma possível.";
    }

    // Default response
    return "Posso ajudar com informações sobre nosso cardápio, promoções, formas de pagamento ou entrega. Se quiser fazer um pedido, é só me dizer o que você gostaria!";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
      
      // If the message looks like a phone number, store it for future use
      if (/^\d{10,11}$/.test(input.trim())) {
        setCustomerPhone(input.trim());
        localStorage.setItem('customer_phone', input.trim());
      }
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Function to simulate post-delivery feedback
  const simulatePostDeliveryFeedback = () => {
    const feedbackMessage: Message = {
      id: Date.now().toString(),
      text: "Você foi bem atendido hoje? 😊",
      sender: 'bot',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, feedbackMessage]);
  };

  return (
    <>
      {/* Chat button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-20 right-6 bg-gradient-to-r from-purple-600 to-green-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center"
          aria-label="Abrir chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className={`fixed bottom-20 right-6 bg-white rounded-xl shadow-2xl z-50 transition-all duration-300 overflow-hidden flex flex-col ${isMinimized ? 'w-72 h-16' : 'w-80 sm:w-96 h-[500px]'}`}>
          {/* Chat header */}
          <div className="bg-gradient-to-r from-purple-600 to-green-500 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} />
              <div>
                <h3 className="font-semibold">Elite Açaí</h3>
                <p className="text-xs text-white/80">Assistente Virtual</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={toggleMinimize} 
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label={isMinimized ? "Expandir chat" : "Minimizar chat"}
              >
                {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <button 
                onClick={toggleChat} 
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Fechar chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat messages */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`rounded-full p-2 ${message.sender === 'user' ? 'bg-purple-600' : 'bg-green-500'} text-white flex-shrink-0`}>
                      {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                  >
                      {message.text === '<PromotionsAIResponse />' ? (
                        <PromotionsAIResponse />
                      ) : (
                        <p className="whitespace-pre-line text-sm" dangerouslySetInnerHTML={{ __html: message.text }}></p>
                      )}
                      <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="rounded-full p-2 bg-green-500 text-white flex-shrink-0">
                      <Bot size={16} />
                    </div>
                    <div className="p-3 rounded-lg bg-white text-gray-800 border border-gray-200">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Chat input */}
          {!isMinimized && (
            <div className="p-3 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className="bg-gradient-to-r from-purple-600 to-green-500 hover:from-purple-700 hover:to-green-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Pergunte sobre nosso cardápio, promoções ou faça seu pedido!
              </p>
              
              {/* Debug buttons - would be removed in production */}
              <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-2">
                <button
                  onClick={simulatePostDeliveryFeedback}
                  className="text-xs text-gray-500 hover:text-gray-700 p-1"
                >
                  Simular feedback pós-entrega
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AcaiChatbot;