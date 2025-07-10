import React, { useState } from 'react';
import { useStoreHours } from '../../hooks/useStoreHours';
import { StoreHours } from '../../types/store';
import { 
  Clock, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  Store,
  Phone,
  MapPin,
  DollarSign,
  Timer,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Bug,
  Info
} from 'lucide-react';

const StoreHoursPanel: React.FC = () => {
  const { 
    storeHours, 
    storeSettings, 
    loading, 
    updateStoreHours, 
    updateStoreSettings,
    getStoreStatus,
    refreshData
  } = useStoreHours();

  const [saving, setSaving] = useState(false);
  const [localHours, setLocalHours] = useState<Record<number, Partial<StoreHours>>>({});
  const [localSettings, setLocalSettings] = useState({
    store_name: '',
    phone: '',
    address: '',
    delivery_fee: 0,
    min_order_value: 0,
    estimated_delivery_time: 0,
    is_open_now: true
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const dayNames = [
    'Domingo',
    'Segunda-feira', 
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  // Inicializar configurações locais quando os dados carregarem
  React.useEffect(() => {
    if (storeSettings) {
      setLocalSettings({
        store_name: storeSettings.store_name || '',
        phone: storeSettings.phone || '',
        address: storeSettings.address || '',
        delivery_fee: storeSettings.delivery_fee || 0,
        min_order_value: storeSettings.min_order_value || 0,
        estimated_delivery_time: storeSettings.estimated_delivery_time || 0,
        is_open_now: storeSettings.is_open_now ?? true
      });
    }
  }, [storeSettings]);

  // Limpar alterações locais quando os dados do servidor mudarem
  React.useEffect(() => {
    setLocalHours({});
  }, [storeHours]);

  const getHoursForDay = (dayOfWeek: number) => {
    const localHour = localHours[dayOfWeek];
    const originalHour = storeHours.find(h => h.day_of_week === dayOfWeek);
    
    return {
      is_open: localHour?.is_open ?? originalHour?.is_open ?? true,
      open_time: localHour?.open_time ?? originalHour?.open_time ?? '08:00',
      close_time: localHour?.close_time ?? originalHour?.close_time ?? '22:00'
    };
  };

  const updateLocalHours = (dayOfWeek: number, field: keyof StoreHours, value: any) => {
    setLocalHours(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value
      }
    }));
  };

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      // Salvar horários modificados
      const savePromises = [];
      
      for (const [dayStr, hours] of Object.entries(localHours)) {
        const day = parseInt(dayStr);
        savePromises.push(updateStoreHours(day, hours));
      }

      // Salvar configurações da loja
      savePromises.push(updateStoreSettings(localSettings));

      await Promise.all(savePromises);

      // Limpar alterações locais
      setLocalHours({});
      
      // Forçar atualização dos dados
      await refreshData();
      
      setLastSaved(new Date());
      
      // Mostrar feedback de sucesso
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Configurações salvas com sucesso!
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
      setLocalHours({});
      
      // Mostrar feedback de atualização
      const refreshMessage = document.createElement('div');
      refreshMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      refreshMessage.innerHTML = `
        <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Dados atualizados!
      `;
      document.body.appendChild(refreshMessage);
      
      setTimeout(() => {
        document.body.removeChild(refreshMessage);
      }, 2000);
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    }
  };

  const storeStatus = getStoreStatus();

  // Função para testar horário
  const testStoreStatus = () => {
    const now = new Date();
    const brasiliaOffset = -3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasilia = new Date(utc + (brasiliaOffset * 3600000));
    
    console.log('🧪 TESTE DE HORÁRIO:');
    console.log('⏰ Horário local:', now.toLocaleTimeString('pt-BR'));
    console.log('🇧🇷 Horário Brasília:', brasilia.toLocaleTimeString('pt-BR'));
    console.log('📅 Dia da semana:', brasilia.getDay());
    console.log('🏪 Status da loja:', storeStatus);
    console.log('📋 Horários configurados:', storeHours);
    console.log('⚙️ Configurações:', storeSettings);
  };

  // Função para detectar horários que cruzam meia-noite
  const detectMidnightCrossing = (openTime: string, closeTime: string) => {
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    
    return closeMinutes < openMinutes;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Carregando configurações...</span>
      </div>
    );
  }

  const hasChanges = Object.keys(localHours).length > 0 || 
    JSON.stringify(localSettings) !== JSON.stringify({
      store_name: storeSettings?.store_name || '',
      phone: storeSettings?.phone || '',
      address: storeSettings?.address || '',
      delivery_fee: storeSettings?.delivery_fee || 0,
      min_order_value: storeSettings?.min_order_value || 0,
      estimated_delivery_time: storeSettings?.estimated_delivery_time || 0,
      is_open_now: storeSettings?.is_open_now ?? true
    });

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Configurações da Loja</h2>
          {lastSaved && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <CheckCircle size={14} className="text-green-500" />
              Última atualização: {lastSaved.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
          >
            <Bug size={16} />
            Debug
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">🧪 Debug - Horário da Loja</h3>
            <button
              onClick={testStoreStatus}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
            >
              Testar Agora
            </button>
          </div>
          <div className="space-y-1">
            <div>⏰ Horário Local: {new Date().toLocaleString('pt-BR')}</div>
            <div>🇧🇷 Horário Brasília: {(() => {
              const now = new Date();
              const brasiliaOffset = -3;
              const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
              const brasilia = new Date(utc + (brasiliaOffset * 3600000));
              return brasilia.toLocaleString('pt-BR');
            })()}</div>
            <div>📅 Dia da Semana: {storeStatus.currentDay}</div>
            <div>🏪 Status: {storeStatus.isOpen ? '🟢 ABERTA' : '🔴 FECHADA'}</div>
            <div>💬 Mensagem: {storeStatus.message}</div>
            <div>⚙️ Controle Manual: {storeSettings?.is_open_now ? 'ATIVO' : 'DESATIVADO'}</div>
            
            {/* Mostrar horários que cruzam meia-noite */}
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="text-yellow-400 font-bold">🌙 Horários que cruzam meia-noite:</div>
              {storeHours.map((hours, index) => {
                const crossesMidnight = detectMidnightCrossing(hours.open_time, hours.close_time);
                if (crossesMidnight) {
                  return (
                    <div key={index} className="text-yellow-300">
                      • {dayNames[hours.day_of_week]}: {hours.open_time} - {hours.close_time}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status Atual da Loja */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Store size={24} className="text-purple-600" />
            Status da Loja
          </h2>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            storeStatus.isOpen 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {storeStatus.isOpen ? '🟢 Aberta' : '🔴 Fechada'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 mb-2">Status atual:</p>
            <p className="font-medium text-lg">{storeStatus.message}</p>
            <p className="text-sm text-gray-500">Hoje: {storeStatus.currentDay}</p>
          </div>
          
          <div>
            <label className="flex items-center gap-2 mb-2">
              <span className="text-gray-700 font-medium">Controle Manual:</span>
            </label>
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, is_open_now: !prev.is_open_now }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                localSettings.is_open_now
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {localSettings.is_open_now ? (
                <>
                  <ToggleRight size={20} />
                  Loja Aberta
                </>
              ) : (
                <>
                  <ToggleLeft size={20} />
                  Loja Fechada
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Sobrescreve os horários automáticos
            </p>
          </div>
        </div>
      </div>

      {/* Configurações da Loja */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store size={24} className="text-purple-600" />
          Informações da Loja
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Loja
            </label>
            <input
              type="text"
              value={localSettings.store_name}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, store_name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Nome da sua loja"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              type="tel"
              value={localSettings.phone}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="(85) 99999-9999"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              type="text"
              value={localSettings.address}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, address: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Endereço completo da loja"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taxa de Entrega (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={localSettings.delivery_fee}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, delivery_fee: parseFloat(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="5.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pedido Mínimo (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={localSettings.min_order_value}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, min_order_value: parseFloat(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="15.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tempo de Entrega (minutos)
            </label>
            <input
              type="number"
              min="1"
              value={localSettings.estimated_delivery_time}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, estimated_delivery_time: parseInt(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="35"
            />
          </div>
        </div>
      </div>

      {/* Horários de Funcionamento */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={24} className="text-purple-600" />
          Horários de Funcionamento
        </h2>

        <div className="space-y-4">
          {dayNames.map((dayName, index) => {
            const hours = getHoursForDay(index);
            const hasLocalChanges = localHours[index];
            const crossesMidnight = detectMidnightCrossing(hours.open_time, hours.close_time);
            
            return (
              <div key={index} className={`border rounded-lg p-4 ${
                hasLocalChanges ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-800 flex items-center gap-2">
                    {dayName}
                    {hasLocalChanges && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                        Modificado
                      </span>
                    )}
                    {crossesMidnight && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                        🌙 Cruza meia-noite
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => updateLocalHours(index, 'is_open', !hours.is_open)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                      hours.is_open
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {hours.is_open ? (
                      <>
                        <ToggleRight size={16} />
                        Aberto
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={16} />
                        Fechado
                      </>
                    )}
                  </button>
                </div>

                {hours.is_open && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Abertura</label>
                        <input
                          type="time"
                          value={hours.open_time}
                          onChange={(e) => updateLocalHours(index, 'open_time', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Fechamento</label>
                        <input
                          type="time"
                          value={hours.close_time}
                          onChange={(e) => updateLocalHours(index, 'close_time', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    
                    {crossesMidnight && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info size={16} className="text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium">Horário que cruza meia-noite</p>
                            <p>Este horário funciona de {hours.open_time} até {hours.close_time} do dia seguinte.</p>
                            <p className="text-xs mt-1">
                              Exemplo: Abre às {hours.open_time} e fecha às {hours.close_time} da madrugada.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Informações Importantes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-2">ℹ️ Informações Importantes</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Os horários são aplicados automaticamente no site</li>
              <li>• Quando fechado, clientes verão "Abrimos em X tempo"</li>
              <li>• O controle manual sobrescreve os horários automáticos</li>
              <li>• Use o controle manual para fechamentos temporários</li>
              <li>• As configurações afetam todo o sistema de delivery</li>
              <li>• Clique em "Atualizar" se os dados não estiverem sincronizados</li>
              <li>• O sistema atualiza automaticamente a cada minuto</li>
              <li>• Use o botão "Debug" para verificar o horário atual</li>
              <li>• <strong>Horários que cruzam meia-noite são suportados</strong> (ex: 16:00 às 00:58)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <div className="flex items-center gap-2 text-yellow-600 text-sm">
            <AlertCircle size={16} />
            Você tem alterações não salvas
          </div>
        )}
        
        <button
          onClick={handleSaveHours}
          disabled={saving || !hasChanges}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            hasChanges
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StoreHoursPanel;