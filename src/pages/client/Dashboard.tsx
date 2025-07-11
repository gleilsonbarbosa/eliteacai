import { useState, useEffect } from 'react';
import { Phone, Wallet, History, ArrowRight, Sparkles, ShoppingBag, Receipt, ChevronDown, ChevronUp, User, Lock, LogOut, MapPin, Calendar, Mail, AlertCircle, LogIn, Tag, Trophy, CreditCard, Gift, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { sendWhatsAppNotification } from '../../lib/notifications';
import toast from 'react-hot-toast';
import { getCurrentPosition, isWithinStoreRange, getClosestStore, formatDistance } from '../../utils/geolocation';
import { getAvailableBalance, getNextExpiringCashback } from '../../utils/transactions';
import type { Customer, Transaction, StoreLocation } from '../../types';
import { STORE_LOCATIONS, TEST_STORE } from '../../types';
import PromotionsAlert from '../../components/PromotionsAlert';
import CashbackAnimation from '../../components/CashbackAnimation';
import ConfirmationModal from '../../components/ConfirmationModal';

// Combine visible stores and test store for geolocation checks
const ALL_STORE_LOCATIONS = [...STORE_LOCATIONS, TEST_STORE];

const ITEMS_PER_PAGE = 10;

function PromoMessage() {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const getPromoMessage = () => {
    switch (today) {
      case 1: // Monday
        return {
          product: 'copo de 300g',
          price: '9,99'
        };
      case 2: // Tuesday
        return {
          product: 'copo de 500g',
          price: '15,99'
        };
      case 3: // Wednesday
        return {
          product: 'copo de 400g',
          price: '12,99'
        };
      case 4: // Thursday
        return {
          product: 'quilo',
          price: '37,99'
        };
      default:
        return {
          product: 'copo de 300g',
          price: '9,99'
        };
    }
  };

  const promo = getPromoMessage();

  return (
    <div className="bg-purple-50 text-purple-700 p-4 rounded-xl text-center font-medium mt-6 border border-purple-100">
      💥 Aproveite! Hoje tem {promo.product} SEM PESO por <span className="font-bold">R${promo.price}</span>! Só na Elite Açaí!
    </div>
  );
}

function ClientDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [email, setEmail] = useState(() => {
    const savedData = localStorage.getItem('loginData');
    return savedData ? JSON.parse(savedData).email : '';
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState(() => {
    const savedData = localStorage.getItem('loginData');
    return savedData ? JSON.parse(savedData).password : '';
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  const [whatsAppConsent, setWhatsAppConsent] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);
  const [showRedemptionForm, setShowRedemptionForm] = useState(false);
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [selectedRedemptionStore, setSelectedRedemptionStore] = useState<StoreLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'purchases' | 'redemptions'>('purchases');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextExpiringAmount, setNextExpiringAmount] = useState<{ amount: number; date: Date } | null>(null);
  const [isTopCustomer, setIsTopCustomer] = useState(false);
  const [topCustomerRank, setTopCustomerRank] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showCashbackAnimation, setShowCashbackAnimation] = useState(false);
  const [lastCashbackAmount, setLastCashbackAmount] = useState(0);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [showRedemptionConfirmation, setShowRedemptionConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (customer) {
      loadTransactions();
      calculateAvailableBalance();
      checkTopCustomerStatus();
      checkLocationAndSetStore();
    }
  }, [customer?.id]);

  useEffect(() => {
    // Reset to first page when changing tabs
    setCurrentPage(1);
  }, [activeTab]);

  const loadTransactions = async () => {
    if (!customer?.id) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erro ao carregar transações');
    }
  };

  const calculateAvailableBalance = async () => {
    if (!customer?.id) return;

    try {
      const balance = await getAvailableBalance(customer.id);
      setAvailableBalance(balance);

      const nextExpiring = await getNextExpiringCashback(customer.id);
      setNextExpiringAmount(nextExpiring);
    } catch (error) {
      console.error('Error calculating balance:', error);
    }
  };

  const checkTopCustomerStatus = async () => {
    if (!customer?.id) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('customer_id, amount')
        .eq('type', 'purchase')
        .eq('status', 'approved');

      if (error) throw error;

      // Calculate total purchases per customer
      const customerTotals = data.reduce((acc, transaction) => {
        const customerId = transaction.customer_id;
        if (!acc[customerId]) {
          acc[customerId] = 0;
        }
        acc[customerId] += parseFloat(transaction.amount);
        return acc;
      }, {} as Record<string, number>);

      // Sort customers by total purchases
      const sortedCustomers = Object.entries(customerTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([customerId]) => customerId);

      const customerRank = sortedCustomers.indexOf(customer.id) + 1;
      const isTop = customerRank <= 10 && customerRank > 0;

      setIsTopCustomer(isTop);
      setTopCustomerRank(isTop ? customerRank : null);
    } catch (error) {
      console.error('Error checking top customer status:', error);
    }
  };

  const checkLocationAndSetStore = async () => {
    try {
      const position = await getCurrentPosition();
      setUserLocation(position);
      setLocationError(null);

      const closestStore = getClosestStore(position, ALL_STORE_LOCATIONS);
      if (closestStore && isWithinStoreRange(position, closestStore)) {
        setSelectedStore(closestStore);
        setSelectedRedemptionStore(closestStore);
      }
    } catch (error) {
      setLocationError('Não foi possível obter sua localização');
      console.error('Location error:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error || !data) {
        toast.error('Telefone não encontrado');
        return;
      }

      // Verify password
      const { data: authData, error: authError } = await supabase.rpc('verify_customer_password', {
        customer_phone: phone,
        password_input: password
      });

      if (authError || !authData) {
        toast.error('Senha incorreta');
        return;
      }

      // Update last login
      await supabase
        .from('customers')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      setCustomer(data);
      
      if (rememberMe) {
        localStorage.setItem('loginData', JSON.stringify({ email, password }));
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('loginData');
        localStorage.removeItem('rememberMe');
      }

      toast.success('Login realizado com sucesso!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name,
          phone,
          email: email || null,
          date_of_birth: dateOfBirth || null,
          password_hash: password,
          whatsapp_consent: whatsAppConsent
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este telefone já está cadastrado');
        } else {
          toast.error('Erro ao criar conta');
        }
        return;
      }

      setCustomer(data);
      toast.success('Conta criada com sucesso!');

      // Send welcome notification if WhatsApp consent is given
      if (whatsAppConsent) {
        try {
          await sendWhatsAppNotification(phone, 'welcome', { name });
        } catch (error) {
          console.error('Error sending welcome notification:', error);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore || !transactionAmount) return;

    setIsSubmitting(true);

    try {
      const amount = parseFloat(transactionAmount);
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          customer_id: customer?.id,
          amount,
          cashback_amount: 0, // Will be calculated by trigger
          type: 'purchase',
          status: 'approved',
          store_id: selectedStore.id,
          location: userLocation ? {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude
          } : null
        })
        .select()
        .single();

      if (error) throw error;

      // Calculate cashback (5% of purchase amount)
      const cashbackAmount = amount * 0.05;
      setLastCashbackAmount(cashbackAmount);
      setShowCashbackAnimation(true);

      setTransactionAmount('');
      await loadTransactions();
      await calculateAvailableBalance();
      
      toast.success(`Compra registrada! Você ganhou R$ ${cashbackAmount.toFixed(2)} de cashback!`);

      // Send WhatsApp notification if consent is given
      if (customer?.whatsapp_consent) {
        try {
          await sendWhatsAppNotification(customer.phone, 'purchase', {
            amount: amount.toFixed(2),
            cashback: cashbackAmount.toFixed(2),
            store: selectedStore.name
          });
        } catch (error) {
          console.error('Error sending purchase notification:', error);
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Erro ao registrar compra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedemption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRedemptionStore || !redemptionAmount) return;

    const amount = parseFloat(redemptionAmount);
    
    if (amount > availableBalance) {
      toast.error('Saldo insuficiente para este resgate');
      return;
    }

    if (amount < 5) {
      toast.error('O valor mínimo para resgate é R$ 5,00');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          customer_id: customer?.id,
          amount,
          cashback_amount: 0,
          type: 'redemption',
          status: 'approved',
          store_id: selectedRedemptionStore.id,
          location: userLocation ? {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude
          } : null
        })
        .select()
        .single();

      if (error) throw error;

      setRedemptionAmount('');
      setShowRedemptionForm(false);
      await loadTransactions();
      await calculateAvailableBalance();
      
      toast.success(`Resgate de R$ ${amount.toFixed(2)} realizado com sucesso!`);

      // Send WhatsApp notification if consent is given
      if (customer?.whatsapp_consent) {
        try {
          await sendWhatsAppNotification(customer.phone, 'redemption', {
            amount: amount.toFixed(2),
            store: selectedRedemptionStore.name
          });
        } catch (error) {
          console.error('Error sending redemption notification:', error);
        }
      }
    } catch (error) {
      console.error('Redemption error:', error);
      toast.error('Erro ao processar resgate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setCustomer(null);
    setPhone('');
    setPassword('');
    setName('');
    setEmail('');
    setDateOfBirth('');
    setConfirmPassword('');
    setWhatsAppConsent(false);
    setTransactions([]);
    setAvailableBalance(0);
    setIsLogin(false);
    
    if (!rememberMe) {
      localStorage.removeItem('loginData');
    }
    
    toast.success('Logout realizado com sucesso!');
  };

  const filteredTransactions = transactions
    .filter(t => activeTab === 'purchases' ? t.type === 'purchase' : t.type === 'redemption');

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'purchase') {
      return status === 'approved' ? 
        <ShoppingBag className="w-5 h-5 text-green-600" /> : 
        <Clock className="w-5 h-5 text-yellow-600" />;
    } else {
      return status === 'approved' ? 
        <Gift className="w-5 h-5 text-purple-600" /> : 
        <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {!customer ? (
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Elite Açaí</h1>
            <p className="text-gray-600">Sistema de Cashback</p>
          </div>

          <div className="flex rounded-lg border border-purple-100 p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Cadastrar
            </button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Seu nome completo"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="input-field"
                placeholder="11999999999"
                maxLength={11}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Digite apenas números (11 dígitos)</p>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="input-field"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Sua senha"
                required
                minLength={6}
              />
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirme sua senha"
                  required
                  minLength={6}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                  Lembrar dados de login
                </label>
              </div>
            )}

            {!isLogin && (
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="whatsappConsent"
                  checked={whatsAppConsent}
                  onChange={(e) => setWhatsAppConsent(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-1"
                />
                <label htmlFor="whatsappConsent" className="ml-2 text-sm text-gray-600">
                  Aceito receber notificações via WhatsApp sobre minhas transações e promoções
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <Link 
                to="/password-reset" 
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Esqueci minha senha
              </Link>
            </div>
          )}

          <PromoMessage />
        </div>
      ) : (
        <>
          <PromotionsAlert />
          
          {/* Welcome Header */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Olá, {customer.name || 'Cliente'}! 👋
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {isTopCustomer && topCustomerRank && (
                      <span className="inline-flex items-center gap-1 text-yellow-600 font-medium">
                        <Trophy className="w-4 h-4" />
                        Top {topCustomerRank} Cliente
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-100">Saldo Disponível</span>
                <Wallet className="w-5 h-5 text-purple-100" />
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(availableBalance)}
              </div>
              {nextExpiringAmount && (
                <div className="text-purple-100 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {formatCurrency(nextExpiringAmount.amount)} expira em{' '}
                  {new Date(nextExpiringAmount.date).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="card-header">
                <ShoppingBag className="w-5 h-5 text-green-600" />
                Registrar Compra
              </h3>
              
              <form onSubmit={handlePurchase} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor da Compra
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="input-field"
                    placeholder="0,00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loja
                  </label>
                  <select
                    value={selectedStore?.id || ''}
                    onChange={(e) => {
                      const store = ALL_STORE_LOCATIONS.find(s => s.id === e.target.value);
                      setSelectedStore(store || null);
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Selecione uma loja</option>
                    {ALL_STORE_LOCATIONS.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                        {userLocation && (
                          ` - ${formatDistance(userLocation, store)}`
                        )}
                      </option>
                    ))}
                  </select>
                  {locationError && (
                    <p className="text-xs text-amber-600 mt-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {locationError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedStore || !transactionAmount}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? 'Processando...' : 'Registrar Compra'}
                </button>
              </form>

              {transactionAmount && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Cashback: {formatCurrency(parseFloat(transactionAmount) * 0.05)}
                  </p>
                </div>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="card-header">
                <Gift className="w-5 h-5 text-purple-600" />
                Resgatar Cashback
              </h3>
              
              {!showRedemptionForm ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {formatCurrency(availableBalance)}
                    </div>
                    <p className="text-sm text-gray-600">Disponível para resgate</p>
                  </div>
                  
                  <button
                    onClick={() => setShowRedemptionForm(true)}
                    disabled={availableBalance < 5}
                    className="btn-secondary w-full"
                  >
                    Resgatar Agora
                  </button>
                  
                  {availableBalance < 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      Valor mínimo: R$ 5,00
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleRedemption} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor do Resgate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="5"
                      max={availableBalance}
                      value={redemptionAmount}
                      onChange={(e) => setRedemptionAmount(e.target.value)}
                      className="input-field"
                      placeholder="5,00"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Máximo: {formatCurrency(availableBalance)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loja para Resgate
                    </label>
                    <select
                      value={selectedRedemptionStore?.id || ''}
                      onChange={(e) => {
                        const store = ALL_STORE_LOCATIONS.find(s => s.id === e.target.value);
                        setSelectedRedemptionStore(store || null);
                      }}
                      className="input-field"
                      required
                    >
                      <option value="">Selecione uma loja</option>
                      {ALL_STORE_LOCATIONS.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                          {userLocation && (
                            ` - ${formatDistance(userLocation, store)}`
                          )}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRedemptionForm(false);
                        setRedemptionAmount('');
                      }}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedRedemptionStore || !redemptionAmount}
                      className="btn-primary flex-1"
                    >
                      {isSubmitting ? 'Processando...' : 'Resgatar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Transactions History */}
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-header !mb-0">
                <History className="w-6 h-6 text-purple-600" />
                Minhas Transações
              </h2>
              <div className="flex rounded-lg border border-purple-100 p-1">
                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'purchases'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Compras
                </button>
                <button
                  onClick={() => setActiveTab('redemptions')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'redemptions'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  Resgates
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {currentTransactions.map(transaction => (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type, transaction.status)}
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(parseFloat(transaction.amount))}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                      <button
                        onClick={() => setExpandedTransactionId(
                          expandedTransactionId === transaction.id ? null : transaction.id
                        )}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {expandedTransactionId === transaction.id ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>

                  {expandedTransactionId === transaction.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-2 font-medium">
                            {transaction.type === 'purchase' ? 'Compra' : 'Resgate'}
                          </span>
                        </div>
                        {transaction.type === 'purchase' && (
                          <div>
                            <span className="text-gray-500">Cashback:</span>
                            <span className="ml-2 font-medium text-green-600">
                              {formatCurrency(parseFloat(transaction.cashback_amount))}
                            </span>
                          </div>
                        )}
                        {transaction.expires_at && (
                          <div>
                            <span className="text-gray-500">Expira em:</span>
                            <span className="ml-2 font-medium">
                              {new Date(transaction.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        {transaction.location && (
                          <div>
                            <span className="text-gray-500">Localização:</span>
                            <span className="ml-2 font-medium">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              Registrada
                            </span>
                          </div>
                        )}
                      </div>
                      {transaction.comment && (
                        <div className="text-sm">
                          <span className="text-gray-500">Observação:</span>
                          <span className="ml-2">{transaction.comment}</span>
                        </div>
                      )}
                      {transaction.receipt_url && (
                        <div className="text-sm">
                          <a 
                            href={transaction.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" />
                            Ver Comprovante
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-purple-100">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {currentTransactions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma transação encontrada
                </div>
              )}
            </div>
          </div>

          <PromoMessage />
        </>
      )}

      {/* Cashback Animation */}
      {showCashbackAnimation && (
        <CashbackAnimation
          amount={lastCashbackAmount}
          onComplete={() => setShowCashbackAnimation(false)}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showPurchaseConfirmation}
        onClose={() => setShowPurchaseConfirmation(false)}
        onConfirm={() => {
          setShowPurchaseConfirmation(false);
          // Handle purchase confirmation
        }}
        title="Confirmar Compra"
        message={`Confirma a compra de ${formatCurrency(parseFloat(transactionAmount || '0'))} na loja ${selectedStore?.name}?`}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      <ConfirmationModal
        isOpen={showRedemptionConfirmation}
        onClose={() => setShowRedemptionConfirmation(false)}
        onConfirm={() => {
          setShowRedemptionConfirmation(false);
          // Handle redemption confirmation
        }}
        title="Confirmar Resgate"
        message={`Confirma o resgate de ${formatCurrency(parseFloat(redemptionAmount || '0'))} na loja ${selectedRedemptionStore?.name}?`}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </div>
  );
}

export default ClientDashboard;