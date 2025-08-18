import React, { useState } from 'react';
import { X, Calendar, Clock, Save, AlertCircle } from 'lucide-react';
import { Product, ScheduledDays } from '../../types/product';

interface ProductScheduleModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, scheduledDays: ScheduledDays) => void;
  currentSchedule?: ScheduledDays | null;
}

const ProductScheduleModal: React.FC<ProductScheduleModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  currentSchedule
}) => {
  const [scheduledDays, setScheduledDays] = useState<ScheduledDays>(() => {
    return currentSchedule || product.scheduledDays || product.availability?.scheduledDays || {
      enabled: false,
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      },
      startTime: '00:00',
      endTime: '23:59'
    };
  });

  const dayLabels = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const handleDayToggle = (day: keyof ScheduledDays['days']) => {
    setScheduledDays(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: !prev.days[day]
      }
    }));
  };

  const handleSelectAll = () => {
    setScheduledDays(prev => ({
      ...prev,
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      }
    }));
  };

  const handleSelectNone = () => {
    setScheduledDays(prev => ({
      ...prev,
      days: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      }
    }));
  };

  const handleSelectWeekdays = () => {
    setScheduledDays(prev => ({
      ...prev,
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      }
    }));
  };

  const handleSelectWeekends = () => {
    setScheduledDays(prev => ({
      ...prev,
      days: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: true,
        sunday: true
      }
    }));
  };

  const handleSelectThursday = () => {
    setScheduledDays(prev => ({
      ...prev,
      days: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: true,
        friday: false,
        saturday: false,
        sunday: false
      }
    }));
  };

  const handleSave = () => {
    console.log('💾 Salvando programação:', {
      productId: product.id,
      productName: product.name,
      scheduledDays
    });
    
    // Validação adicional
    if (scheduledDays.enabled && getSelectedDaysCount() === 0) {
      alert('⚠️ Selecione pelo menos um dia da semana ou desative a programação específica.');
      return;
    }
    
    onSave(product.id, scheduledDays);
    
    // Feedback visual de sucesso
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
    successMessage.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      Programação salva com sucesso!
    `;
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 3000);
    
    onClose();
  };

  const handleClose = () => {
    console.log('❌ Fechando modal sem salvar');
    // Resetar para o estado atual do banco ao fechar
    setScheduledDays(currentSchedule || product.scheduledDays || product.availability?.scheduledDays || {
      enabled: false,
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      },
      startTime: '00:00',
      endTime: '23:59'
    });
    onClose();
  };

  const getSelectedDaysCount = () => {
    return Object.values(scheduledDays.days).filter(Boolean).length;
  };

  const getSelectedDaysText = () => {
    const selectedDays = Object.entries(scheduledDays.days)
      .filter(([_, enabled]) => enabled)
      .map(([day, _]) => dayLabels[day as keyof typeof dayLabels]);
    
    if (selectedDays.length === 0) return 'Nenhum dia selecionado';
    if (selectedDays.length === 7) return 'Todos os dias';
    return selectedDays.join(', ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-purple-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Programar Dias de Disponibilidade
                </h2>
                <p className="text-gray-600 text-sm">{product.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Ativar/Desativar Programação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 mt-0.5" />
              <div className="flex-1">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={scheduledDays.enabled}
                    onChange={(e) => setScheduledDays(prev => ({
                      ...prev,
                      enabled: e.target.checked
                    }))}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div>
                    <span className="font-medium text-blue-800">
                      Ativar programação por dias específicos
                    </span>
                    <p className="text-blue-700 text-sm mt-1">
                      Quando ativado, este produto só estará disponível nos dias selecionados abaixo.
                      Quando desativado, o produto seguirá as regras normais de disponibilidade.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {scheduledDays.enabled && (
            <>
              {/* Botões de Seleção Rápida */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Seleção Rápida</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    Todos os dias
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectWeekdays}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    Dias úteis
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectWeekends}
                    className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                  >
                    Fins de semana
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectThursday}
                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                  >
                    Quinta Elite
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Nenhum dia
                  </button>
                </div>
              </div>

              {/* Seleção de Dias */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Dias da Semana ({getSelectedDaysCount()}/7 selecionados)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(dayLabels).map(([key, label]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        scheduledDays.days[key as keyof ScheduledDays['days']]
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={scheduledDays.days[key as keyof ScheduledDays['days']]}
                        onChange={() => handleDayToggle(key as keyof ScheduledDays['days'])}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="font-medium text-gray-800">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Horário Específico */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Horário de Disponibilidade</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horário de Início
                      </label>
                      <div className="relative">
                        <Clock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="time"
                          value={scheduledDays.startTime || '00:00'}
                          onChange={(e) => setScheduledDays(prev => ({
                            ...prev,
                            startTime: e.target.value
                          }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horário de Fim
                      </label>
                      <div className="relative">
                        <Clock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="time"
                          value={scheduledDays.endTime || '23:59'}
                          onChange={(e) => setScheduledDays(prev => ({
                            ...prev,
                            endTime: e.target.value
                          }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Deixe em branco para disponibilizar durante todo o dia nos dias selecionados.
                  </p>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Resumo da Programação
                </h4>
                <div className="text-sm text-purple-700 space-y-1">
                  <p><strong>Dias selecionados:</strong> {getSelectedDaysText()}</p>
                  {scheduledDays.startTime && scheduledDays.endTime && (
                    <p><strong>Horário:</strong> {scheduledDays.startTime} às {scheduledDays.endTime}</p>
                  )}
                  {getSelectedDaysCount() === 0 && (
                    <p className="text-red-600 font-medium">⚠️ Nenhum dia selecionado - produto ficará indisponível!</p>
                  )}
                  <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                    <strong>💾 Esta configuração será salva no banco de dados</strong> e aplicada automaticamente para este produto em todos os dispositivos.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={scheduledDays.enabled && getSelectedDaysCount() === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Salvar no Banco
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductScheduleModal;