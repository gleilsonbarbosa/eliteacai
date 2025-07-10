import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionGuard from '../PermissionGuard';
import { Settings, Printer, Scale, Save, RefreshCw, Store, Phone, MapPin, Truck, ShoppingBag, ToggleLeft, ToggleRight, Table, Percent, Store as StoreIcon, LayoutTemplate, Volume2, VolumeX, MessageCircle, AlertCircle, Sliders } from 'lucide-react';
import ScaleConfigPanel from './ScaleConfigPanel';

interface PDVSettingsState {
  store_name: string;
  store_address: string;
  store_phone: string;
  tax_rate: number;
  receipt_footer: string;
  scale_port: string;
  scale_enabled: boolean;
  scale_auto_reconnect: boolean;
  scale_stable_timeout: number;
  scale_model: string;
  printer_enabled: boolean;
  printer_name: string;
  auto_print_receipt: boolean;
  delivery_enabled: boolean;
  auto_accept_orders: boolean;
  link_complements_to_pdv: boolean;
  change_status_by_pdv_code: boolean;
  delivery_printer: string;
  secondary_printer: string;
  dont_print_order_automatically: boolean;
  print_two_copies: boolean;
  enable_complement_description: boolean;
  tables_enabled: boolean;
  tables_count: number;
  auto_surcharge_enabled: boolean;
  auto_surcharge_percentage: number;
  counter_enabled: boolean;
  counter_count: number;
  printer_layout: {
    paper_width: string;
    page_size: number;
    font_size: number;
    delivery_font_size: number;
    scale: number;
    margin_left: number;
    margin_top: number;
    margin_bottom: number;
  };
}

interface SoundSettings {
  enabled: boolean;
  volume: number;
  soundUrl: string;
}

const PDVSettings: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [settings, setSettings] = useState<PDVSettingsState>({
    store_name: 'Elite Açaí',
    store_address: 'Rua das Frutas, 123 - Centro',
    store_phone: '(85) 98904-1010',
    tax_rate: 0,
    receipt_footer: 'Obrigado pela preferência! Volte sempre!',
    scale_port: 'COM1',
    scale_enabled: true,
    scale_auto_reconnect: true,
    scale_stable_timeout: 5000,
    scale_model: 'Toledo Prix 3 Fit',
    printer_enabled: true,
    printer_name: 'Impressora Térmica',
    auto_print_receipt: true,
    delivery_enabled: true,
    auto_accept_orders: false,
    link_complements_to_pdv: true,
    change_status_by_pdv_code: false,
    delivery_printer: 'Impressora Térmica',
    secondary_printer: '',
    dont_print_order_automatically: false,
    print_two_copies: true,
    enable_complement_description: true,
    tables_enabled: true,
    tables_count: 4,
    auto_surcharge_enabled: false,
    auto_surcharge_percentage: 0,
    counter_enabled: true,
    counter_count: 2,
    printer_layout: {
      paper_width: '80mm',
      page_size: 300,
      font_size: 2,
      delivery_font_size: 14,
      scale: 1,
      margin_left: 0,
      margin_top: 1,
      margin_bottom: 1
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [orderSoundSettings, setOrderSoundSettings] = useState<SoundSettings>({
    enabled: true,
    volume: 0.7,
    soundUrl: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
  });
  const [chatSoundSettings, setChatSoundSettings] = useState<SoundSettings>({
    enabled: true,
    volume: 0.5,
    soundUrl: "https://assets.mixkit.co/active_storage/sfx/1862/1862-preview.mp3"
  });
  const [showScaleConfig, setShowScaleConfig] = useState(false);
  const [availableSounds, setAvailableSounds] = useState<{id: string, name: string, url: string}[]>([
    { id: "bell", name: "Campainha", url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" },
    { id: "notification", name: "Notificação", url: "https://assets.mixkit.co/active_storage/sfx/1862/1862-preview.mp3" },
    { id: "alert", name: "Alerta", url: "https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3" },
    { id: "chime", name: "Sino", url: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3" }
  ]);

  // Simular carregamento de configurações
  useEffect(() => {
    // Em um ambiente real, carregaria do localStorage ou banco de dados
    const savedSettings = localStorage.getItem('pdv_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Carregar configurações de som
    const savedOrderSoundSettings = localStorage.getItem('orderSoundSettings');
    if (savedOrderSoundSettings) {
      setOrderSoundSettings(JSON.parse(savedOrderSoundSettings));
    } else {
      localStorage.setItem('orderSoundSettings', JSON.stringify(orderSoundSettings));
    }
    
    const savedChatSoundSettings = localStorage.getItem('chatSoundSettings');
    if (savedChatSoundSettings) {
      setChatSoundSettings(JSON.parse(savedChatSoundSettings));
    } else {
      localStorage.setItem('chatSoundSettings', JSON.stringify(chatSoundSettings));
    }
    
    // Simular detecção de impressoras
    setAvailablePrinters(['Impressora Térmica', 'Microsoft Print to PDF', 'Epson TM-T20']);
    
    // Simular detecção de portas seriais
    setAvailablePorts(['COM1', 'COM2', 'COM3', '/dev/ttyUSB0']);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Em um ambiente real, salvaria no banco de dados
      localStorage.setItem('pdv_settings', JSON.stringify(settings));
      
      // Salvar configurações de som
      localStorage.setItem('orderSoundSettings', JSON.stringify(orderSoundSettings));
      localStorage.setItem('chatSoundSettings', JSON.stringify(chatSoundSettings));
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrinter = () => {
    if (!settings.printer_enabled) {
      alert('Impressora desativada nas configurações');
      return;
    }
    
    alert(`Teste de impressão enviado para ${settings.printer_name}`);
    // Em um ambiente real, enviaria um teste para a impressora
  };

  const handleTestScale = () => {
    alert(`Tentando conectar à balança na porta ${settings.scale_port}`);
    // Em um ambiente real, tentaria conectar à balança
  };
  
  const handleShowScaleConfig = () => {
    setShowScaleConfig(true);
  };

  // Testar som de pedidos
  const handleTestOrderSound = () => {
    if (!orderSoundSettings.enabled) {
      alert('Som de pedidos desativado nas configurações');
      return;
    }
    
    try {
      const audio = new Audio(orderSoundSettings.soundUrl);
      audio.volume = orderSoundSettings.volume;
      audio.play().catch(e => console.error('Erro ao tocar som de teste:', e));
    } catch (error) {
      console.error('Erro ao testar som:', error);
      alert('Erro ao testar som de pedidos');
    }
  };

  // Testar som de chat
  const handleTestChatSound = () => {
    if (!chatSoundSettings.enabled) {
      alert('Som de chat desativado nas configurações');
      return;
    }
    
    try {
      const audio = new Audio(chatSoundSettings.soundUrl);
      audio.volume = chatSoundSettings.volume;
      audio.play().catch(e => console.error('Erro ao tocar som de teste:', e));
    } catch (error) {
      console.error('Erro ao testar som:', error);
      alert('Erro ao testar som de chat');
    }
  };

  return (
    <PermissionGuard hasPermission={hasPermission('can_manage_products')} showMessage={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Settings size={24} className="text-gray-600" />
              Configurações do PDV
            </h2>
            <p className="text-gray-600">Configure o sistema de ponto de venda</p>
          </div>
          {lastSaved && (
            <p className="text-sm text-gray-500">
              Última atualização: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>

      {/* Configurações de Som */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Volume2 size={20} className="text-blue-600" />
          Configurações de Som
        </h3>

        <div className="space-y-6">
          {/* Som de Pedidos */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
              <ShoppingBag size={18} className="text-blue-600" />
              Som de Novos Pedidos
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={orderSoundSettings.enabled}
                    onChange={(e) => setOrderSoundSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-blue-700">
                    Ativar som para novos pedidos
                  </span>
                </label>
                <p className="text-xs text-blue-600 mt-1 ml-6">
                  Toca um alerta sonoro quando novos pedidos são recebidos
                </p>
              </div>
              
              {orderSoundSettings.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Volume
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={orderSoundSettings.volume}
                      onChange={(e) => setOrderSoundSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>Baixo</span>
                      <span>Médio</span>
                      <span>Alto</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Som
                    </label>
                    <select
                      value={orderSoundSettings.soundUrl}
                      onChange={(e) => setOrderSoundSettings(prev => ({ ...prev, soundUrl: e.target.value }))}
                      className="w-full p-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {availableSounds.map(sound => (
                        <option key={sound.id} value={sound.url}>{sound.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <button
                      onClick={handleTestOrderSound}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Volume2 size={16} />
                      Testar Som
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Som de Chat */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
              <MessageCircle size={18} className="text-purple-600" />
              Som de Mensagens de Chat
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={chatSoundSettings.enabled}
                    onChange={(e) => setChatSoundSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm font-medium text-purple-700">
                    Ativar som para novas mensagens
                  </span>
                </label>
                <p className="text-xs text-purple-600 mt-1 ml-6">
                  Toca um alerta sonoro quando novas mensagens são recebidas
                </p>
              </div>
              
              {chatSoundSettings.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">
                      Volume
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={chatSoundSettings.volume}
                      onChange={(e) => setChatSoundSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-purple-600">
                      <span>Baixo</span>
                      <span>Médio</span>
                      <span>Alto</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">
                      Som
                    </label>
                    <select
                      value={chatSoundSettings.soundUrl}
                      onChange={(e) => setChatSoundSettings(prev => ({ ...prev, soundUrl: e.target.value }))}
                      className="w-full p-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {availableSounds.map(sound => (
                        <option key={sound.id} value={sound.url}>{sound.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <button
                      onClick={handleTestChatSound}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Volume2 size={16} />
                      Testar Som
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Informações da Loja */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store size={20} className="text-blue-600" />
          Informações da Loja
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Loja
            </label>
            <input
              type="text"
              value={settings.store_name}
              onChange={(e) => setSettings(prev => ({ ...prev, store_name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome da loja"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={settings.store_phone}
                onChange={(e) => setSettings(prev => ({ ...prev, store_phone: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <div className="relative">
              <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={settings.store_address}
                onChange={(e) => setSettings(prev => ({ ...prev, store_address: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Endereço completo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taxa de Imposto (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={settings.tax_rate}
              onChange={(e) => setSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Configurações de Mesas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Table size={20} className="text-indigo-600" />
          Cadastro de Mesas
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.tables_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, tables_enabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar Mesas
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Permite gerenciar pedidos por mesas no PDV
            </p>
          </div>

          {settings.tables_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade de Mesas
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.tables_count}
                onChange={(e) => setSettings(prev => ({ ...prev, tables_count: parseInt(e.target.value) || 4 }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Configurações de Acréscimo Automático */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Percent size={20} className="text-green-600" />
          Cadastro de Acréscimo Automático
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.auto_surcharge_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_surcharge_enabled: e.target.checked }))}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar acréscimo automático
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Aplica um acréscimo percentual automático em todas as vendas
            </p>
          </div>

          {settings.auto_surcharge_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Acréscimo automático em %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.auto_surcharge_percentage}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_surcharge_percentage: parseFloat(e.target.value) || 0 }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Configurações de Balcão */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <StoreIcon size={20} className="text-orange-600" />
          Cadastro de Balcão
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.counter_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, counter_enabled: e.target.checked }))}
                className="w-4 h-4 text-orange-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar balcão
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Permite gerenciar pedidos de balcão no PDV
            </p>
          </div>

          {settings.counter_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade de Balcões
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.counter_count}
                onChange={(e) => setSettings(prev => ({ ...prev, counter_count: parseInt(e.target.value) || 2 }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Configurações de Delivery */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Truck size={20} className="text-indigo-600" />
          Configurações de Delivery
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.delivery_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, delivery_enabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar Delivery
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Permite receber e gerenciar pedidos de delivery no PDV
            </p>
          </div>

          {settings.delivery_enabled && (
            <>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.auto_accept_orders}
                    onChange={(e) => setSettings(prev => ({ ...prev, auto_accept_orders: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Aceitar pedidos automaticamente
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Pedidos serão automaticamente aceitos ao serem recebidos
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.link_complements_to_pdv}
                    onChange={(e) => setSettings(prev => ({ ...prev, link_complements_to_pdv: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Vínculo de complementos ao PDV
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Complementos do delivery serão vinculados aos produtos do PDV
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.change_status_by_pdv_code}
                    onChange={(e) => setSettings(prev => ({ ...prev, change_status_by_pdv_code: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Alterar status por código PDV
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Permite alterar o status do pedido através de códigos no PDV
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impressora Padrão do Delivery
                </label>
                <select
                  value={settings.delivery_printer}
                  onChange={(e) => setSettings(prev => ({ ...prev, delivery_printer: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availablePrinters.map(printer => (
                    <option key={printer} value={printer}>{printer}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impressora secundária
                </label>
                <select
                  value={settings.secondary_printer}
                  onChange={(e) => setSettings(prev => ({ ...prev, secondary_printer: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Nenhuma</option>
                  {availablePrinters.map(printer => (
                    <option key={printer} value={printer}>{printer}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Opcional: Impressora adicional para cópias ou setores específicos
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.dont_print_order_automatically}
                    onChange={(e) => setSettings(prev => ({ ...prev, dont_print_order_automatically: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Não imprimir pedido automaticamente
                  </span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.print_two_copies}
                    onChange={(e) => setSettings(prev => ({ ...prev, print_two_copies: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Imprimir duas vias do Pedido
                  </span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.enable_complement_description}
                    onChange={(e) => setSettings(prev => ({ ...prev, enable_complement_description: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Habilitar descrição nos complementos
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Exibe descrições detalhadas dos complementos nos pedidos
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <ShoppingBag size={18} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Status do Delivery</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${settings.delivery_enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-blue-700">
                        {settings.delivery_enabled ? 'Delivery Ativo' : 'Delivery Inativo'}
                      </span>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, delivery_enabled: !prev.delivery_enabled }))}
                      className={`mt-2 flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
                        settings.delivery_enabled 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {settings.delivery_enabled ? (
                        <>
                          <ToggleRight size={16} />
                          Desativar Delivery
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={16} />
                          Ativar Delivery
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Configurações de Impressora */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Printer size={20} className="text-purple-600" />
          Configurações de Impressora
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.printer_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, printer_enabled: e.target.checked }))}
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar impressora
              </span>
            </label>
          </div>

          {settings.printer_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impressora
                </label>
                <select
                  value={settings.printer_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, printer_name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {availablePrinters.map(printer => (
                    <option key={printer} value={printer}>{printer}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.auto_print_receipt}
                    onChange={(e) => setSettings(prev => ({ ...prev, auto_print_receipt: e.target.checked }))}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Imprimir automaticamente ao finalizar venda
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texto do Rodapé do Cupom
                </label>
                <textarea
                  value={settings.receipt_footer}
                  onChange={(e) => setSettings(prev => ({ ...prev, receipt_footer: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Texto que aparecerá no rodapé do cupom"
                />
              </div>

              <div>
                <button
                  onClick={handleTestPrinter}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Printer size={16} />
                  Testar Impressora
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Configurações de Balança */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Scale size={20} className="text-orange-600" />
          Configuração de Balança
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.scale_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, scale_enabled: e.target.checked }))}
                className="w-4 h-4 text-orange-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar balança
              </span>
            </label>
          </div>
          
          {settings.scale_enabled && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-700">Configuração Avançada</h4>
                  <p className="text-sm text-gray-500">
                    Configure parâmetros de comunicação, porta serial e outras opções
                  </p>
                </div>
                <button
                  onClick={handleShowScaleConfig}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Sliders size={16} />
                  Configurar
                </button>
              </div>
            </>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.scale_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, scale_enabled: e.target.checked }))}
                className="w-4 h-4 text-orange-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar balança
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Ativa a integração com balança para produtos pesáveis
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo da Balança
            </label>
            <select
              value={settings.scale_model}
              onChange={(e) => setSettings(prev => ({ ...prev, scale_model: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Toledo Prix 3 Fit">Toledo Prix 3 Fit</option>
              <option value="Toledo Prix 4">Toledo Prix 4</option>
              <option value="Filizola">Filizola</option>
              <option value="Toledo Prix 5i">Toledo Prix 5i</option>
              <option value="Toledo 9091">Toledo 9091</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Porta Serial
            </label>
            <select
              value={settings.scale_port}
              onChange={(e) => setSettings(prev => ({ ...prev, scale_port: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {availablePorts.map(port => (
                <option key={port} value={port}>{port}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.scale_auto_reconnect}
                onChange={(e) => setSettings(prev => ({ ...prev, scale_auto_reconnect: e.target.checked }))}
                className="w-4 h-4 text-orange-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Reconexão automática
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Tenta reconectar automaticamente se a balança for desconectada
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tempo de espera para peso estável (ms)
            </label>
            <input
              type="number"
              min="1000"
              max="10000"
              step="500"
              value={settings.scale_stable_timeout}
              onChange={(e) => setSettings(prev => ({ ...prev, scale_stable_timeout: parseInt(e.target.value) || 5000 }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tempo máximo de espera para obter um peso estável (em milissegundos)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Informações sobre a balança Toledo Prix 3 Fit</p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Protocolo de comunicação: <code className="bg-blue-100 px-1 rounded">ST,GS,+00.000kg</code></li>
                  <li>• Velocidade de comunicação: 9600 bps</li>
                  <li>• Bits de dados: 8</li>
                  <li>• Bits de parada: 1</li>
                  <li>• Paridade: Nenhuma</li>
                  <li>• Controle de fluxo: Nenhum</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={handleTestScale}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Scale size={16} />
              Testar Conexão com Balança
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Certifique-se de que a balança está ligada e conectada ao computador
            </p>
          </div>
        </div>
      </div>
      
      {/* Scale Configuration Modal */}
      {showScaleConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ScaleConfigPanel onClose={() => setShowScaleConfig(false)} />
          </div>
        </div>
      )}

      {/* Configurações de Layout de Impressão */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <LayoutTemplate size={20} className="text-indigo-600" />
          Layout de Impressão
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Largura do papel
              </label>
              <select
                value={settings.printer_layout?.paper_width || '80mm'}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    paper_width: e.target.value
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
                <option value="A4">A4</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho da página (mm)
              </label>
              <input
                type="number"
                value={settings.printer_layout?.page_size || 300}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    page_size: parseInt(e.target.value) || 300
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho da Fonte (px)
              </label>
              <input
                type="number"
                value={settings.printer_layout?.font_size || 2}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    font_size: parseInt(e.target.value) || 2
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho da Fonte Delivery (px)
              </label>
              <input
                type="number"
                value={settings.printer_layout?.delivery_font_size || 14}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    delivery_font_size: parseInt(e.target.value) || 14
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Escala
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2"
                value={settings.printer_layout?.scale || 1}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    scale: parseFloat(e.target.value) || 1
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem Lateral (px)
              </label>
              <input
                type="number"
                min="0"
                value={settings.printer_layout?.margin_left || 0}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    margin_left: parseInt(e.target.value) || 0
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem Superior (px)
              </label>
              <input
                type="number"
                min="0"
                value={settings.printer_layout?.margin_top || 1}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    margin_top: parseInt(e.target.value) || 1
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem Inferior (px)
              </label>
              <input
                type="number"
                min="0"
                value={settings.printer_layout?.margin_bottom || 1}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  printer_layout: {
                    ...prev.printer_layout,
                    margin_bottom: parseInt(e.target.value) || 1
                  }
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                printer_layout: {
                  paper_width: '80mm',
                  page_size: 300,
                  font_size: 2,
                  delivery_font_size: 14,
                  scale: 1,
                  margin_left: 0,
                  margin_top: 1,
                  margin_bottom: 1
                }
              }))}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Restaurar Padrão Inicial
            </button>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
              setSettings({
                store_name: 'Elite Açaí',
                store_address: 'Rua das Frutas, 123 - Centro',
                store_phone: '(85) 98904-1010',
                tax_rate: 0,
                receipt_footer: 'Obrigado pela preferência! Volte sempre!',
                scale_port: 'COM1',
                scale_model: 'Toledo Prix 3 Fit',
                printer_enabled: true,
                printer_name: 'Impressora Térmica',
                auto_print_receipt: true,
                delivery_enabled: true,
                auto_accept_orders: false,
                link_complements_to_pdv: true,
                change_status_by_pdv_code: false,
                delivery_printer: 'Impressora Térmica',
                secondary_printer: '',
                dont_print_order_automatically: false,
                print_two_copies: true,
                enable_complement_description: true,
                tables_enabled: true,
                tables_count: 4,
                auto_surcharge_enabled: false,
                auto_surcharge_percentage: 0,
                counter_enabled: true,
                counter_count: 2,
                printer_layout: {
                  paper_width: '80mm',
                  page_size: 300,
                  font_size: 2,
                  delivery_font_size: 14,
                  scale: 1,
                  margin_left: 0,
                  margin_top: 1,
                  margin_bottom: 1
                }
              });
              
              // Restaurar configurações de som
              setOrderSoundSettings({
                enabled: true,
                volume: 0.7,
                soundUrl: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
              });
              
              setChatSoundSettings({
                enabled: true,
                volume: 0.5,
                soundUrl: "https://assets.mixkit.co/active_storage/sfx/1862/1862-preview.mp3"
              });
            }
          }}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Restaurar Padrão
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
    </PermissionGuard>
  );
};

export default PDVSettings;