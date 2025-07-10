import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart, MessageCircle, Trash2, MapPin, ArrowLeft, Gift } from 'lucide-react';
import { CartItem } from '../../types/product';
import { DeliveryInfo } from '../../types/delivery';
import { Customer, CustomerBalance } from '../../types/cashback';
import { useOrders } from '../../hooks/useOrders';
import { useNeighborhoods } from '../../hooks/useNeighborhoods';
import { useCashback } from '../../hooks/useCashback';
import CashbackDisplay from '../Cashback/CashbackDisplay';
import CashbackButton from '../Cashback/CashbackButton';

interface CartProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  totalPrice: number;
  disabled?: boolean;
}

const Cart: React.FC<CartProps> = ({
  items,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  totalPrice,
  disabled = false
}) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerBalance, setCustomerBalance] = useState<CustomerBalance | null>(null);
  const [appliedCashback, setAppliedCashback] = useState(0);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    name: '',
    phone: '',
    address: '',
    neighborhood: '',
    complement: '',
    paymentMethod: 'money'
  });

  const { createOrder } = useOrders();
  const { neighborhoods, getNeighborhoodByName } = useNeighborhoods();
  const { 
    getOrCreateCustomer, 
    getCustomerBalance, 
    createPurchaseTransaction, 
    createRedemptionTransaction,
    validateCashbackAmount 
  } = useCashback();

  // Carregar dados do cliente quando o telefone for preenchido
  useEffect(() => {
    const loadCustomerData = async () => {
      if (deliveryInfo.phone && deliveryInfo.phone.length >= 11) {
        try {
          const customerData = await getOrCreateCustomer(deliveryInfo.phone, deliveryInfo.name);
          setCustomer(customerData);
          
          const balance = await getCustomerBalance(customerData.id);
          setCustomerBalance(balance);
        } catch (error) {
          console.error('Erro ao carregar dados do cliente:', error);
        }
      } else {
        setCustomer(null);
        setCustomerBalance(null);
        setAppliedCashback(0);
      }
    };

    loadCustomerData();
  }, [deliveryInfo.phone, deliveryInfo.name, getOrCreateCustomer, getCustomerBalance]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getSelectedNeighborhood = () => {
    return getNeighborhoodByName(deliveryInfo.neighborhood);
  };

  const getDeliveryFee = () => {
    const neighborhood = getSelectedNeighborhood();
    return neighborhood ? neighborhood.delivery_fee : 0;
  };

  const getEstimatedDeliveryTime = () => {
    const neighborhood = getSelectedNeighborhood();
    return neighborhood ? neighborhood.delivery_time : 50;
  };

  const getSubtotal = () => {
    return totalPrice + getDeliveryFee();
  };

  const getTotalWithCashback = () => {
    return Math.max(0, getSubtotal() - appliedCashback);
  };

  const handleApplyCashback = async (amount: number) => {
    if (!customer || !customerBalance) return;

    try {
      const validation = await validateCashbackAmount(customer.id, amount);
      if (validation.valid) {
        setAppliedCashback(amount);
      } else {
        alert(validation.message);
      }
    } catch (error) {
      console.error('Erro ao validar cashback:', error);
      alert('Erro ao aplicar cashback');
    }
  };

  const handleRemoveCashback = () => {
    setAppliedCashback(0);
  };

  const generateWhatsAppMessage = (orderId?: string, cashbackEarned?: number) => {
    let message = `🥤 *PEDIDO ELITE AÇAÍ*\n\n`;
    
    // Itens do pedido
    message += `📋 *ITENS:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name.replace(/[^\x00-\x7F]/g, "")}`;
      if (item.selectedSize) {
        message += ` (${item.selectedSize.name.replace(/[^\x00-\x7F]/g, "")})`;
      }
      message += `\n   Qtd: ${item.quantity}x - ${formatPrice(item.totalPrice)}`;
      
      // Complementos selecionados
      if (item.selectedComplements && item.selectedComplements.length > 0) {
        message += `\n   *Complementos:*`;
        item.selectedComplements.forEach(selected => {
          message += `\n   • ${selected.complement.name.replace(/[^\x00-\x7F]/g, "")}`;
          if (selected.complement.price > 0) {
            message += ` (+${formatPrice(selected.complement.price)})`;
          }
        });
      }
      
      if (item.observations) {
        message += `\n   *Obs:* ${item.observations.replace(/[^\x00-\x7F]/g, "")}`;
      }
      message += `\n\n`;
    });

    // Valores
    message += `💰 *VALORES:*\n`;
    message += `Subtotal: ${formatPrice(totalPrice)}\n`;
    if (getDeliveryFee() > 0) {
      message += `Taxa de entrega (${deliveryInfo.neighborhood}): ${formatPrice(getDeliveryFee())}\n`;
    }
    if (appliedCashback > 0) {
      message += `Desconto cashback: -${formatPrice(appliedCashback)}\n`;
    }
    message += `*TOTAL: ${formatPrice(getTotalWithCashback())}*\n\n`;

    // Cashback ganho
    if (cashbackEarned && cashbackEarned > 0) {
      message += `🎁 *CASHBACK GANHO:*\n`;
      message += `Você ganhou ${formatPrice(cashbackEarned)} de cashback!\n`;
      message += `Use até o final deste mês.\n\n`;
    }

    // Dados de entrega
    message += `📍 *DADOS DE ENTREGA:*\n`;
    message += `Nome: ${deliveryInfo.name.replace(/[^\x00-\x7F]/g, "")}\n`;
    message += `Telefone: ${deliveryInfo.phone}\n`;
    message += `Endereço: ${deliveryInfo.address.replace(/[^\x00-\x7F]/g, "")}\n`;
    message += `Bairro: ${deliveryInfo.neighborhood.replace(/[^\x00-\x7F]/g, "")}`;
    
    const neighborhood = getSelectedNeighborhood();
    if (neighborhood) {
      message += ` (Entrega: ${neighborhood.delivery_time}min)`;
    }
    message += `\n`;
    
    if (deliveryInfo.complement) {
      message += `Complemento: ${deliveryInfo.complement.replace(/[^\x00-\x7F]/g, "")}\n`;
    }
    
    // Forma de pagamento
    message += `\n💳 *PAGAMENTO:* `;
    switch (deliveryInfo.paymentMethod) {
      case 'money':
        message += `Dinheiro`;
        if (deliveryInfo.changeFor) {
          message += ` (Troco para ${formatPrice(deliveryInfo.changeFor)})`;
        }
        break;
      case 'pix':
        message += `PIX\n`;
        message += `📱 *DADOS PIX:*\n`;
        message += `Chave: 85989041010\n`;
        message += `Nome: Grupo Elite\n`;
        message += `Valor: ${formatPrice(getTotalWithCashback())}\n\n`;
        message += `⚠️ *IMPORTANTE:* Envie o comprovante do PIX para confirmar o pedido!`;
        break;
      case 'card':
        message += `Cartão`;
        break;
    }

    // Link de acompanhamento se o pedido foi criado
    if (orderId) {
      message += `\n\n🔗 *ACOMPANHAR PEDIDO:*\n`;
      message += `${window.location.origin}/pedido/${orderId}\n\n`;
      message += `📱 *Salve este link para acompanhar seu pedido em tempo real!*`;
    }

    return encodeURIComponent(message);
  };

  const handleSendOrder = async () => {
    try {
      const neighborhood = getSelectedNeighborhood();
      
      // Criar pedido no sistema
      const orderData = {
        customer_name: deliveryInfo.name,
        customer_phone: deliveryInfo.phone,
        customer_address: deliveryInfo.address,
        customer_neighborhood: deliveryInfo.neighborhood,
        customer_complement: deliveryInfo.complement,
        payment_method: deliveryInfo.paymentMethod,
        change_for: deliveryInfo.changeFor,
        neighborhood_id: neighborhood?.id,
        delivery_fee: getDeliveryFee(),
        estimated_delivery_minutes: getEstimatedDeliveryTime(),
        customer_id: customer?.id,
        items: items.map(item => ({
          id: item.id,
          product_name: item.product.name,
          product_image: item.product.image,
          selected_size: item.selectedSize?.name,
          quantity: item.quantity,
          unit_price: item.selectedSize?.price || item.product.price,
          total_price: item.totalPrice,
          observations: item.observations,
          complements: item.selectedComplements.map(sc => ({
            name: sc.complement.name,
            price: sc.complement.price
          }))
        })),
        total_price: getTotalWithCashback(),
        status: 'pending' as const
      };

      const newOrder = await createOrder(orderData);
      setOrderId(newOrder.id);

      let cashbackEarned = 0;

      // Processar transações de cashback se cliente estiver identificado
      if (customer) {
        // Aplicar resgate de cashback se houver
        if (appliedCashback > 0) {
          // Round to 2 decimal places to ensure precision consistency
          const roundedCashback = Math.round(appliedCashback * 100) / 100;
          await createRedemptionTransaction(customer.id, roundedCashback, newOrder.id);
        }

        // Criar transação de compra para gerar cashback
        const purchaseTransaction = await createPurchaseTransaction(
          customer.id, 
          getTotalWithCashback(), 
          newOrder.id
        );
        cashbackEarned = purchaseTransaction.cashback_amount;
      }

      // Enviar para WhatsApp com informações de cashback
      const message = generateWhatsAppMessage(newOrder.id, cashbackEarned);
      const whatsappUrl = `https://wa.me/5585989041010?text=${message}`;
      window.open(whatsappUrl, '_blank');

      // Limpar carrinho e mostrar tracking
      onClearCart();
      setShowCheckout(false);
      setShowOrderTracking(true);
      
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      // Fallback para WhatsApp apenas
      const message = generateWhatsAppMessage();
      const whatsappUrl = `https://wa.me/5585989041010?text=${message}`;
      window.open(whatsappUrl, '_blank');
      onClearCart();
      setShowCheckout(false);
      onClose();
    }
  };

  const isFormValid = () => {
    return deliveryInfo.name && 
           deliveryInfo.phone && 
           deliveryInfo.address && 
           deliveryInfo.neighborhood;
  };

  const handleContinueShopping = () => {
    onClose();
  };

  if (!isOpen) return null;

  // Mostrar tela de acompanhamento se pedido foi criado
  if (showOrderTracking && orderId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <ShoppingCart size={32} className="text-green-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Pedido Enviado!
          </h2>
          <p className="text-gray-600 mb-4">
            Seu pedido foi recebido e está sendo processado.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">ID do Pedido:</p>
            <p className="font-mono font-bold text-purple-600">
              #{orderId.slice(-8)}
            </p>
          </div>

          {customer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 justify-center">
                <Gift size={16} className="text-green-600" />
                <p className="text-sm text-green-700 font-medium">
                  Cashback processado com sucesso!
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              📱 O link para acompanhar seu pedido foi enviado pelo WhatsApp!
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowOrderTracking(false);
                onClose();
                window.location.href = `/pedido/${orderId}`;
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Acompanhar Pedido
            </button>
            
            <button
              onClick={() => {
                setShowOrderTracking(false);
                onClose();
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart size={24} />
            {showCheckout ? 'Finalizar Pedido' : 'Seu Carrinho'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!showCheckout ? (
            // Carrinho
            <div className="p-4">
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">Seu carrinho está vazio</p>
                  <button
                    onClick={handleContinueShopping}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <ArrowLeft size={18} />
                    Continuar Comprando
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{item.product.name}</h3>
                          {item.selectedSize && (
                            <p className="text-sm text-gray-600">{item.selectedSize.name}</p>
                          )}
                          
                          {/* Complementos */}
                          {item.selectedComplements && item.selectedComplements.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">Complementos:</p>
                              <div className="space-y-1">
                                {item.selectedComplements.map((selected, idx) => (
                                  <p key={idx} className="text-xs text-gray-600">
                                    • {selected.complement.name}
                                    {selected.complement.price > 0 && (
                                      <span className="text-green-600 ml-1">
                                        (+{formatPrice(selected.complement.price)})
                                      </span>
                                    )}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {item.observations && (
                            <p className="text-sm text-gray-500 italic mt-1">Obs: {item.observations}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={disabled}
                                className="bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="font-medium w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={disabled}
                                className="bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-purple-600">
                                {formatPrice(item.totalPrice)}
                              </span>
                              <button
                                onClick={() => onRemoveItem(item.id)}
                                disabled={disabled}
                                className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Checkout
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={deliveryInfo.name}
                  onChange={(e) => setDeliveryInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={deliveryInfo.phone}
                  onChange={(e) => setDeliveryInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="(85) 99999-9999"
                />
              </div>

              {/* Exibir cashback se cliente identificado */}
              {customerBalance && (
                <CashbackDisplay balance={customerBalance} />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro *
                </label>
                <div className="relative">
                  <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={deliveryInfo.neighborhood}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, neighborhood: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecione seu bairro</option>
                    {neighborhoods.map(neighborhood => (
                      <option key={neighborhood.id} value={neighborhood.name}>
                        {neighborhood.name} - {formatPrice(neighborhood.delivery_fee)} ({neighborhood.delivery_time}min)
                      </option>
                    ))}
                  </select>
                </div>
                {deliveryInfo.neighborhood && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <div className="flex justify-between">
                      <span>Taxa de entrega:</span>
                      <span className="font-medium">{formatPrice(getDeliveryFee())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tempo estimado:</span>
                      <span className="font-medium">{getEstimatedDeliveryTime()} minutos</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={deliveryInfo.address}
                  onChange={(e) => setDeliveryInfo(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Rua, número"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={deliveryInfo.complement}
                  onChange={(e) => setDeliveryInfo(prev => ({ ...prev, complement: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Apartamento, bloco, etc."
                />
              </div>

              {/* Botão de Cashback */}
              {customerBalance && customerBalance.available_balance > 0 && (
                <CashbackButton
                  availableBalance={customerBalance.available_balance}
                  onApplyCashback={handleApplyCashback}
                  onRemoveCashback={handleRemoveCashback}
                  appliedAmount={appliedCashback}
                  disabled={disabled}
                  maxAmount={getSubtotal()}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de pagamento *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      value="money"
                      checked={deliveryInfo.paymentMethod === 'money'}
                      onChange={(e) => setDeliveryInfo(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="text-purple-600"
                    />
                    <span>Dinheiro</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      value="pix"
                      checked={deliveryInfo.paymentMethod === 'pix'}
                      onChange={(e) => setDeliveryInfo(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="text-purple-600"
                    />
                    <span>PIX</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={deliveryInfo.paymentMethod === 'card'}
                      onChange={(e) => setDeliveryInfo(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="text-purple-600"
                    />
                    <span>Cartão</span>
                  </label>
                </div>
              </div>

              {/* Informações do PIX */}
              {deliveryInfo.paymentMethod === 'pix' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Dados para PIX
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-blue-300">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Chave PIX:</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-lg font-bold text-blue-900">85989041010</p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText('85989041010');
                                // Feedback visual
                                const btn = event?.target as HTMLElement;
                                const originalText = btn.textContent;
                                btn.textContent = 'Copiado!';
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                }, 2000);
                              }}
                              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                            >
                              Copiar
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-700">Nome:</p>
                          <p className="font-semibold text-blue-900">Grupo Elite</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-700">Valor:</p>
                          <p className="font-bold text-lg text-green-600">
                            {formatPrice(getTotalWithCashback())}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Importante:</p>
                          <p className="text-sm text-yellow-700">
                            Após fazer o PIX, envie o comprovante pelo WhatsApp para confirmar seu pedido.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {deliveryInfo.paymentMethod === 'money' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Troco para quanto?
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deliveryInfo.changeFor || ''}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, changeFor: parseFloat(e.target.value) || undefined }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Valor para troco"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {showCheckout && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                {getDeliveryFee() > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de entrega:</span>
                    <span>{formatPrice(getDeliveryFee())}</span>
                  </div>
                )}
                {appliedCashback > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto cashback:</span>
                    <span>-{formatPrice(appliedCashback)}</span>
                  </div>
                )}
                <hr />
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-xl font-bold text-green-600">
                {showCheckout ? formatPrice(getTotalWithCashback()) : formatPrice(totalPrice)}
              </span>
            </div>
            
            {!showCheckout ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={disabled}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  {disabled ? 'Loja Fechada' : 'Finalizar Pedido'}
                </button>
                <button
                  onClick={handleContinueShopping}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Continuar Comprando
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Voltar ao Carrinho
                </button>
                <button
                  onClick={handleSendOrder}
                  disabled={!isFormValid() || disabled}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  {disabled ? 'Loja Fechada' : 'Finalizar Pedido'}
                </button>
                <button
                  onClick={handleContinueShopping}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Continuar Comprando
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;