import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionGuard from '../PermissionGuard';
import { 
  Calendar, Download, Printer, RefreshCw, 
  DollarSign, TrendingUp, TrendingDown, 
  Clock, ShoppingCart, Truck, 
  Search, Filter, ArrowDownCircle, 
  ArrowUpCircle, ChevronDown, ChevronUp,
  CreditCard, User
} from 'lucide-react';

interface CashReportProps {
  onBack?: () => void;
}

interface CashSummary {
  date_range: {
    start_date: string;
    end_date: string;
  };
  totals: {
    opening_amount: number;
    closing_amount: number;
    sales_total: number;
    delivery_total: number;
    other_income_total: number;
    total_expense: number;
    expected_balance: number;
    difference: number;
    sales_count: number;
    delivery_count: number;
  };
  payment_methods: Record<string, {
    pdv_total: number;
    pdv_count: number;
    delivery_total: number;
    delivery_count: number;
    other_total: number;
    other_count: number;
    expense_total: number;
    expense_count: number;
  }>;
  entries: Array<{
    id: string;
    date: string;
    type: 'income' | 'expense';
    source: 'pdv' | 'delivery' | 'manual';
    description: string;
    payment_method: string;
    amount: number;
    operator_name?: string;
  }>;
}

const PDVCashReportWithDateFilter: React.FC<CashReportProps> = ({ onBack }) => {
  const { hasPermission } = usePermissions();
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [operatorId, setOperatorId] = useState<string>('');
  const [operators, setOperators] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<CashSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    paymentMethods: true,
    transactions: true
  });
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailedEntries, setDetailedEntries] = useState<Array<any>>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Load operators for filter
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const { data, error } = await supabase
          .from('pdv_operators')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        setOperators(data || []);
      } catch (err) {
        console.error('Error fetching operators:', err);
      }
    };
    
    fetchOperators();
  }, []);

  // Generate report when parameters change
  useEffect(() => {
    if (startDate && endDate) {
      generateReport();
    }
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Generating report for period:', { startDate, endDate, operatorId });
      
      // Get all cash registers in the date range
      const { data: registers, error: registersError } = await supabase
        .from('pdv_cash_registers')
        .select(`
          id,
          opening_amount,
          closing_amount,
          difference,
          opened_at,
          closed_at,
          operator_id,
          pdv_operators(name)
        `)
        .gte('opened_at', `${startDate}T00:00:00`)
        .lte('opened_at', `${endDate}T23:59:59`)
        .order('opened_at');
      
      if (registersError) throw registersError;
      
      if (!registers || registers.length === 0) {
        setLoading(false);
        setError('Nenhum caixa encontrado no período selecionado');
        return;
      }
      
      // Get all entries for these registers
      const registerIds = registers.map(r => r.id);
      const { data: entries, error: entriesError } = await supabase
        .from('pdv_cash_entries')
        .select('*')
        .in('register_id', registerIds)
        .order('created_at');
      
      if (entriesError) throw entriesError;
      
      // Process data for report
      const summary: CashSummary = {
        date_range: {
          start_date: startDate,
          end_date: endDate
        },
        totals: {
          opening_amount: 0,
          closing_amount: 0,
          sales_total: 0,
          delivery_total: 0,
          other_income_total: 0,
          total_expense: 0,
          expected_balance: 0,
          difference: 0,
          sales_count: 0,
          delivery_count: 0
        },
        payment_methods: {},
        entries: []
      };
      
      // Calculate totals
      summary.totals.opening_amount = registers.reduce((sum, r) => sum + (r.opening_amount || 0), 0);
      summary.totals.closing_amount = registers.reduce((sum, r) => sum + (r.closing_amount || 0), 0);
      summary.totals.difference = registers.reduce((sum, r) => sum + (r.difference || 0), 0);
      
      // Process entries
      if (entries) {
        entries.forEach(entry => {
          // Determine source
          let source: 'pdv' | 'delivery' | 'manual' = 'manual';
          if (entry.description.includes('Venda #')) {
            source = 'pdv';
            summary.totals.sales_total += entry.amount;
            summary.totals.sales_count++;
          } else if (entry.description.includes('Delivery #')) {
            source = 'delivery';
            summary.totals.delivery_total += entry.amount;
            summary.totals.delivery_count++;
          } else if (entry.type === 'income') {
            summary.totals.other_income_total += entry.amount;
          } else if (entry.type === 'expense') {
            summary.totals.total_expense += entry.amount;
          }
          
          // Initialize payment method if not exists
          if (!summary.payment_methods[entry.payment_method]) {
            summary.payment_methods[entry.payment_method] = {
              pdv_total: 0,
              pdv_count: 0,
              delivery_total: 0,
              delivery_count: 0,
              other_total: 0,
              other_count: 0,
              expense_total: 0,
              expense_count: 0
            };
          }
          
          // Update payment method totals
          if (source === 'pdv' && entry.type === 'income') {
            summary.payment_methods[entry.payment_method].pdv_total += entry.amount;
            summary.payment_methods[entry.payment_method].pdv_count++;
          } else if (source === 'delivery' && entry.type === 'income') {
            summary.payment_methods[entry.payment_method].delivery_total += entry.amount;
            summary.payment_methods[entry.payment_method].delivery_count++;
          } else if (source === 'manual' && entry.type === 'income') {
            summary.payment_methods[entry.payment_method].other_total += entry.amount;
            summary.payment_methods[entry.payment_method].other_count++;
          } else if (entry.type === 'expense') {
            summary.payment_methods[entry.payment_method].expense_total += entry.amount;
            summary.payment_methods[entry.payment_method].expense_count++;
          }
          
          // Find operator name
          const register = registers.find(r => r.id === entry.register_id);
          const operatorName = register?.pdv_operators?.name || 'Sistema';
          
          // Add to entries list
          summary.entries.push({
            id: entry.id,
            date: entry.created_at,
            type: entry.type,
            source,
            description: entry.description,
            payment_method: entry.payment_method,
            amount: entry.amount,
            operator_name: operatorName
          });
        });
      }
      
      // Calculate expected balance
      summary.totals.expected_balance = summary.totals.opening_amount + 
        summary.totals.sales_total + 
        summary.totals.delivery_total + 
        summary.totals.other_income_total - 
        summary.totals.total_expense;
      
      setReport(summary);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedEntriesForDate = async (date: string) => {
    setLoading(true);
    try {
      // Format date for query
      const queryDate = new Date(date).toISOString().split('T')[0];
      
      // Get cash register for this date
      const { data: registers, error: registersError } = await supabase
        .from('pdv_cash_registers')
        .select('id')
        .gte('opened_at', `${queryDate}T00:00:00`)
        .lte('opened_at', `${queryDate}T23:59:59`);
      
      if (registersError) throw registersError;
      
      if (!registers || registers.length === 0) {
        setDetailedEntries([]);
        setLoading(false);
        return;
      }
      
      // Get all entries for this register
      const registerId = registers[0].id;
      const { data: entries, error: entriesError } = await supabase
        .from('pdv_cash_entries')
        .select('*')
        .eq('register_id', registerId)
        .order('created_at');
      
      if (entriesError) throw entriesError;
      
      setDetailedEntries(entries || []);
    } catch (err) {
      console.error('Error fetching detailed entries:', err);
      setDetailedEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  const handleExport = () => {
    if (!report) return;
    
    // Create CSV content
    const headers = ['Data/Hora', 'Tipo', 'Canal', 'Descrição', 'Forma Pgto', 'Valor', 'Operador'];
    
    // Filter entries based on current filters
    const filteredEntries = report.entries.filter(entry => {
      if (filterType !== 'all' && entry.type !== filterType) return false;
      if (filterPayment !== 'all' && entry.payment_method !== filterPayment) return false;
      if (searchTerm && !entry.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    
    const rows = filteredEntries.map(entry => [
      new Date(entry.date).toLocaleString('pt-BR'),
      entry.type === 'income' ? 'Entrada' : 'Saída',
      entry.source === 'pdv' ? 'PDV' : entry.source === 'delivery' ? 'Delivery' : 'Manual',
      entry.description,
      getPaymentMethodLabel(entry.payment_method),
      formatPrice(entry.type === 'income' ? entry.amount : -entry.amount),
      entry.operator_name || '-'
    ]);
    
    // Add summary rows
    const summaryRows = [
      ['', '', '', '', '', ''],
      ['RESUMO DO CAIXA', '', '', '', '', ''],
      ['Período', `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`, '', '', '', ''],
      ['', '', '', '', '', ''],
      ['Tipo', '', '', '', '', 'Valor'],
      ['Abertura de Caixa', '', '', '', '', formatPrice(report.totals.opening_amount)],
      ['Vendas PDV', '', '', '', '', formatPrice(report.totals.sales_total)],
      ['Vendas Delivery', '', '', '', '', formatPrice(report.totals.delivery_total)],
      ['Outras Entradas', '', '', '', '', formatPrice(report.totals.other_income_total)],
      ['Saídas', '', '', '', '', formatPrice(report.totals.total_expense)],
      ['Saldo Esperado', '', '', '', '', formatPrice(report.totals.expected_balance)],
      ['Fechamento', '', '', '', '', formatPrice(report.totals.closing_amount)],
      ['Diferença', '', '', '', '', formatPrice(report.totals.difference)]
    ];
    
    // Add payment method summary
    const paymentRows = [
      ['', '', '', '', '', ''],
      ['RESUMO POR FORMA DE PAGAMENTO', '', '', '', '', ''],
      ['Forma', 'PDV', 'Delivery', 'Outras Entradas', 'Saídas', 'Total']
    ];
    
    Object.entries(report.payment_methods).forEach(([method, data]) => {
      const total = data.pdv_total + data.delivery_total + data.other_total - data.expense_total;
      paymentRows.push([
        getPaymentMethodLabel(method),
        formatPrice(data.pdv_total),
        formatPrice(data.delivery_total),
        formatPrice(data.other_total),
        formatPrice(data.expense_total),
        formatPrice(total)
      ]);
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      ...summaryRows.map(row => row.join(',')),
      ...paymentRows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-caixa-${startDate}-${endDate}.csv`;
    link.click();
  };

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
    const labels: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito',
      'voucher': 'Voucher',
      'misto': 'Pagamento Misto'
    };
    return labels[method] || method;
  };

  const getEntryTypeIcon = (type: string) => {
    return type === 'income' ? 
      <ArrowDownCircle size={16} className="text-green-500" /> : 
      <ArrowUpCircle size={16} className="text-red-500" />;
  };

  const getEntryTypeLabel = (type: string) => {
    return type === 'income' ? 'Entrada' : 'Saída';
  };

  const handleDateClick = (date: string) => {
    if (selectedDate === date) {
      setSelectedDate(null);
      setDetailedEntries([]);
    } else {
      setSelectedDate(date);
      fetchDetailedEntriesForDate(date);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'pdv':
        return <ShoppingCart size={16} className="text-blue-500" />;
      case 'delivery':
        return <Truck size={16} className="text-purple-500" />;
      default:
        return <DollarSign size={16} className="text-green-500" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'pdv':
        return 'PDV';
      case 'delivery':
        return 'Delivery';
      default:
        return 'Manual';
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filterEntries = (entry: CashSummary['entries'][0]) => {
    // Filter by type
    if (filterType !== 'all' && entry.type !== filterType) {
      return false;
    }
    
    // Filter by payment method
    if (filterPayment !== 'all' && entry.payment_method !== filterPayment) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !entry.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  };

  return (
    <PermissionGuard hasPermission={hasPermission('can_view_cash_report')} showMessage={true}>
      <div className={`space-y-6 ${printMode ? 'print:bg-white print:p-0' : ''}`}>
        {/* Header - Hide in print mode */}
        {!printMode && (
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={24} className="text-blue-600" />
                Relatório de Caixa por Período
              </h2>
              <p className="text-gray-600">Resumo completo das movimentações por período</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Printer size={16} />
                Imprimir
              </button>
              <button
                onClick={handleExport}
                disabled={!report}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Exportar CSV
              </button>
            </div>
          </div>
        )}

      {/* Print Header - Only show in print mode */}
      {printMode && (
        <div className="print-header">
          <h1 className="text-2xl font-bold text-center">Relatório de Caixa - Elite Açaí</h1>
          <p className="text-center text-gray-600">
            Período: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-center text-gray-500 text-sm">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
          <hr className="my-4" />
        </div>
      )}

      {/* Date Selector - Hide in print mode */}
      {!printMode && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <div className="relative">
                <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <div className="relative">
                <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operador
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os operadores</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <button
                onClick={generateReport}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Carregando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Gerar Relatório
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div ref={printRef}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 mt-2">Tente ajustar o período de busca</p>
          </div>
        ) : !report ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Selecione um período e clique em "Gerar Relatório"</p>
          </div>
        ) : (
          <>
            {/* Financial Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 cursor-pointer" 
                   onClick={() => toggleSection('summary')}>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign size={20} className="text-green-600" />
                  Resumo Financeiro do Período
                </h3>
                {expandedSections.summary ? 
                  <ChevronUp size={20} className="text-gray-500" /> : 
                  <ChevronDown size={20} className="text-gray-500" />}
              </div>

              {expandedSections.summary && (
                <>
                  <div className="text-sm text-gray-500 mb-4">
                    Período: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 rounded-full p-2">
                          <ShoppingCart size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-800">Vendas PDV</h4>
                          <p className="text-sm text-blue-600">{report.totals.sales_count} vendas</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-blue-700 text-right">
                        {formatPrice(report.totals.sales_total)}
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-purple-100 rounded-full p-2">
                          <Truck size={20} className="text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-purple-800">Vendas Delivery</h4>
                          <p className="text-sm text-purple-600">{report.totals.delivery_count} vendas</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-purple-700 text-right">
                        {formatPrice(report.totals.delivery_total)}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-green-100 rounded-full p-2">
                          <ArrowDownCircle size={20} className="text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-green-800">Entradas Manuais</h4>
                          <p className="text-sm text-green-600">Entradas não relacionadas a vendas</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-green-700 text-right">
                        {formatPrice(report.totals.other_income_total)}
                      </p>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-100 rounded-full p-2">
                          <ArrowUpCircle size={20} className="text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-red-800">Saídas</h4>
                          <p className="text-sm text-red-600">Despesas e retiradas</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-red-700 text-right">
                        {formatPrice(report.totals.total_expense)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-gray-100 rounded-full p-2">
                          <DollarSign size={20} className="text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">Abertura de Caixa</h4>
                          <p className="text-sm text-gray-600">Valor inicial</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-gray-700 text-right">
                        {formatPrice(report.totals.opening_amount)}
                      </p>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-yellow-100 rounded-full p-2">
                          <DollarSign size={20} className="text-yellow-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-yellow-800">Saldo Esperado</h4>
                          <p className="text-sm text-yellow-600">Abertura + Entradas - Saídas</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-yellow-700 text-right">
                        {formatPrice(report.totals.expected_balance)}
                      </p>
                    </div>

                    <div className={`rounded-lg p-4 border ${
                      report.totals.difference > 0
                        ? 'bg-green-50 border-green-100'
                        : report.totals.difference < 0
                        ? 'bg-red-50 border-red-100'
                        : 'bg-blue-50 border-blue-100'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`rounded-full p-2 ${
                          report.totals.difference > 0
                            ? 'bg-green-100'
                            : report.totals.difference < 0
                            ? 'bg-red-100'
                            : 'bg-blue-100'
                        }`}>
                          <DollarSign size={20} className={
                            report.totals.difference > 0
                              ? 'text-green-600'
                              : report.totals.difference < 0
                              ? 'text-red-600'
                              : 'text-blue-600'
                          } />
                        </div>
                        <div>
                          <h4 className={`font-medium ${
                            report.totals.difference > 0
                              ? 'text-green-800'
                              : report.totals.difference < 0
                              ? 'text-red-800'
                              : 'text-blue-800'
                          }`}>
                            Diferença
                          </h4>
                          <p className={`text-sm ${
                            report.totals.difference > 0
                              ? 'text-green-600'
                              : report.totals.difference < 0
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }`}>
                            {report.totals.difference > 0 
                              ? 'Sobra de caixa'
                              : report.totals.difference < 0
                              ? 'Falta no caixa'
                              : 'Fechamento exato'}
                          </p>
                        </div>
                      </div>
                      <p className={`text-xl font-bold text-right ${
                        report.totals.difference > 0
                          ? 'text-green-700'
                          : report.totals.difference < 0
                          ? 'text-red-700'
                          : 'text-blue-700'
                      }`}>
                        {formatPrice(report.totals.difference)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Payment Methods Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 cursor-pointer" 
                   onClick={() => toggleSection('paymentMethods')}>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard size={20} className="text-purple-600" />
                  Resumo por Forma de Pagamento
                </h3>
                {expandedSections.paymentMethods ? 
                  <ChevronUp size={20} className="text-gray-500" /> : 
                  <ChevronDown size={20} className="text-gray-500" />}
              </div>

              {expandedSections.paymentMethods && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Forma de Pagamento</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Vendas PDV</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Vendas Delivery</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Entradas Manuais</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Saídas</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(report.payment_methods).map(([method, data]) => {
                        const total = data.pdv_total + data.delivery_total + data.other_total - data.expense_total;
                        return (
                          <tr key={method} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-medium">{getPaymentMethodLabel(method)}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.pdv_total > 0 ? (
                                <span className="text-green-600 font-medium">{formatPrice(data.pdv_total)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.delivery_total > 0 ? (
                                <span className="text-green-600 font-medium">{formatPrice(data.delivery_total)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.other_total > 0 ? (
                                <span className="text-green-600 font-medium">{formatPrice(data.other_total)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {data.expense_total > 0 ? (
                                <span className="text-red-600 font-medium">{formatPrice(data.expense_total)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-semibold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPrice(total)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="py-3 px-4">TOTAL</td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {formatPrice(report.totals.sales_total)}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {formatPrice(report.totals.delivery_total)}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {formatPrice(report.totals.other_income_total)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {formatPrice(report.totals.total_expense)}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {formatPrice(report.totals.sales_total + report.totals.delivery_total + 
                                      report.totals.other_income_total - report.totals.total_expense)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Detailed Transactions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 cursor-pointer"
                   onClick={() => toggleSection('transactions')}>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Clock size={20} className="text-blue-600" />
                  Movimentações Detalhadas
                </h3>
                {expandedSections.transactions ? 
                  <ChevronUp size={20} className="text-gray-500" /> : 
                  <ChevronDown size={20} className="text-gray-500" />}
              </div>

              {expandedSections.transactions && (
                <>
                  {!printMode && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                          className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">Todos os tipos</option>
                          <option value="income">Apenas entradas</option>
                          <option value="expense">Apenas saídas</option>
                        </select>
                      </div>
                      
                      <div className="relative">
                        <CreditCard size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                          value={filterPayment}
                          onChange={(e) => setFilterPayment(e.target.value)}
                          className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">Todas as formas</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="pix">PIX</option>
                          <option value="cartao_credito">Cartão de Crédito</option>
                          <option value="cartao_debito">Cartão de Débito</option>
                          <option value="voucher">Voucher</option>
                        </select>
                      </div>
                      
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar descrição..."
                          className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Data/Hora</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Canal</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Descrição</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Forma Pgto</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Valor</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Operador</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {report.entries.filter(filterEntries).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-gray-500">
                              Nenhuma movimentação encontrada com os filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          report.entries.filter(filterEntries).map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <span className="text-sm">{formatDate(entry.date)}</span>
                                <button
                                  onClick={() => handleDateClick(entry.date)} 
                                  className="text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 px-2 py-1 rounded mt-1 inline-flex items-center gap-1"
                                >
                                  {selectedDate === entry.date ? (
                                    <>
                                      <ChevronUp size={12} />
                                      Ocultar detalhes
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={12} />
                                      Ver detalhes
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {getEntryTypeIcon(entry.type)}
                                  <span className={`text-sm font-medium ${
                                    entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {getEntryTypeLabel(entry.type)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {getSourceIcon(entry.source)}
                                  <span className="text-sm">{getSourceLabel(entry.source)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm">{entry.description}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm">{getPaymentMethodLabel(entry.payment_method)}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={`font-semibold ${
                                  entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {entry.type === 'income' ? '+' : '-'}
                                  {formatPrice(entry.amount)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm">{entry.operator_name || '-'}</span>
                              </td>
                            </tr>
                          )).slice(0, 100) // Limit to 100 entries for performance
                        )}
                        {selectedDate && (
                          <tr>
                            <td colSpan={7} className="px-6 py-4">
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="font-medium text-gray-800 mb-3">Detalhes do Caixa - {new Date(selectedDate).toLocaleDateString('pt-BR')}</h4>
                                
                                {loading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">Carregando detalhes...</span>
                                  </div>
                                ) : detailedEntries.length === 0 ? (
                                  <p className="text-gray-500 text-center py-2">Nenhuma movimentação encontrada para este caixa.</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Hora</th>
                                          <th className="px-3 py-2 text-left">Tipo</th>
                                          <th className="px-3 py-2 text-left">Descrição</th>
                                          <th className="px-3 py-2 text-left">Forma Pgto</th>
                                          <th className="px-3 py-2 text-right">Valor</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {detailedEntries.map((entry) => (
                                          <tr key={entry.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                              {new Date(entry.created_at).toLocaleTimeString('pt-BR')}
                                            </td>
                                            <td className="px-3 py-2">
                                              <div className="flex items-center gap-1">
                                                {entry.type === 'income' ? (
                                                  <ArrowDownCircle size={14} className="text-green-500" />
                                                ) : (
                                                  <ArrowUpCircle size={14} className="text-red-500" />
                                                )}
                                                <span className={entry.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                                  {entry.type === 'income' ? 'Entrada' : 'Saída'}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2">{entry.description}</td>
                                            <td className="px-3 py-2">{getPaymentMethodLabel(entry.payment_method)}</td>
                                            <td className="px-3 py-2 text-right font-medium">
                                              <span className={entry.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                                {entry.type === 'income' ? '+' : '-'}{formatPrice(entry.amount)}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          
          body {
            font-family: Arial, sans-serif;
            color: #000;
            background: #fff;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f2f2f2;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .print-header h1 {
            font-size: 24px;
            margin-bottom: 5px;
          }
          
          .print-header p {
            font-size: 14px;
            color: #666;
          }
        }
      `}</style>
    </div>
    </PermissionGuard>
  );
};

export default PDVCashReportWithDateFilter;