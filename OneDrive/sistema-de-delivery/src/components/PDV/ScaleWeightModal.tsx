import React, { useState, useEffect } from 'react';
import { Scale, X, Check, AlertCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { WeightReading } from '../../types/pdv';

interface ScaleWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWeightConfirm: (weight: number) => void;
  productName: string;
  isScaleConnected: boolean;
  currentWeight: WeightReading | null;
  requestStableWeight: () => Promise<number | null>;
  isReading: boolean;
}

const ScaleWeightModal: React.FC<ScaleWeightModalProps> = ({
  isOpen,
  onClose,
  onWeightConfirm,
  productName,
  isScaleConnected,
  currentWeight,
  requestStableWeight,
  isReading
}) => {
  const [manualWeight, setManualWeight] = useState<string>('');
  const [isRequestingWeight, setIsRequestingWeight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weightMode, setWeightMode] = useState<'scale' | 'manual'>(isScaleConnected ? 'scale' : 'manual');
  const [weightHistory, setWeightHistory] = useState<WeightReading[]>([]);
  const [weightAttempts, setWeightAttempts] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setManualWeight('');
      setError(null);
      setWeightMode(isScaleConnected ? 'scale' : 'manual');
      setWeightHistory([]);
      setWeightAttempts(0);
    }
  }, [isOpen, isScaleConnected]);

  // Add current weight to history when it changes
  useEffect(() => {
    if (currentWeight && isOpen) {
      setWeightHistory(prev => {
        // Only add if weight is different from last entry
        if (prev.length === 0 || Math.abs(prev[prev.length - 1].weight - currentWeight.weight) > 0.001) {
          return [...prev.slice(-4), currentWeight]; // Keep last 5 readings
        }
        return prev;
      });
    }
  }, [currentWeight, isOpen]);

  const handleRequestWeight = async () => {
    if (!isScaleConnected) {
      setError('Balança não conectada. Por favor, use o modo manual.');
      setWeightMode('manual');
      return;
    }

    setIsRequestingWeight(true);
    setError(null);
    setWeightAttempts(prev => prev + 1);

    try {
      const weight = await requestStableWeight();
      if (weight !== null) {
        onWeightConfirm(weight * 1000); // Convert kg to g
        onClose();
      } else {
        // Mensagem de erro mais detalhada com sugestões
        if (weightAttempts >= 2) {
          setError('Não foi possível obter um peso estável após várias tentativas. Verifique se o produto está corretamente posicionado na balança ou use o modo manual.');
        } else {
          setError('Não foi possível obter um peso estável. Verifique se o produto está corretamente posicionado na balança e tente novamente.');
        }
        
        // Se já tentou mais de 2 vezes, sugerir modo manual
        if (weightAttempts >= 2) {
          setTimeout(() => {
            setWeightMode('manual');
          }, 2000);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao ler peso da balança: ${errorMessage}. Tente novamente ou use o modo manual.`);
      console.error('Error requesting weight:', err);
      
      // Se já tentou mais de 1 vez, sugerir modo manual
      if (weightAttempts >= 1) {
        setTimeout(() => {
          setWeightMode('manual');
        }, 2000);
      }
    } finally {
      setIsRequestingWeight(false);
    }
  };

  const handleManualWeightSubmit = () => {
    const weight = parseFloat(manualWeight);
    if (isNaN(weight) || weight <= 0) {
      setError('Por favor, digite um valor válido maior que zero.');
      return;
    }
    
    onWeightConfirm(weight);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm">
                <Scale size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Pesagem de Produto</h2>
                <p className="text-white/80 text-sm truncate max-w-[200px]">{productName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mode Selection */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <div className="flex gap-3">
              <button
                onClick={() => setWeightMode('scale')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  weightMode === 'scale'
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${!isScaleConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isScaleConnected}
              >
                <div className="flex items-center justify-center gap-2">
                  <Scale size={18} />
                  <span>Usar Balança</span>
                </div>
                {!isScaleConnected && (
                  <p className="text-xs mt-1">Balança desconectada</p>
                )}
              </button>
              <button
                onClick={() => setWeightMode('manual')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  weightMode === 'manual'
                    ? 'bg-green-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Inserir Manual</span>
                </div>
              </button>
            </div>
          </div>

          {weightMode === 'scale' ? (
            <div className="space-y-6">
              {/* Scale Status */}
              <div className={`p-4 rounded-lg border ${
                isScaleConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              } mb-4`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${
                    isScaleConnected ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isScaleConnected ? (
                      <Check size={20} className="text-green-600" />
                    ) : (
                      <AlertCircle size={20} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-medium ${
                      isScaleConnected ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {isScaleConnected ? 'Balança Conectada' : 'Balança Desconectada'}
                    </h3>
                    <p className={`text-sm ${
                      isScaleConnected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isScaleConnected 
                        ? 'Pronta para uso' 
                        : 'Verifique a conexão ou use o modo manual'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}

              {/* Current Weight Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-5xl font-bold mb-2 font-mono">
                  {currentWeight 
                    ? `${(currentWeight.weight * 1000).toFixed(0)}g`
                    : '---'
                  }
                </div>
                
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  currentWeight?.stable
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  
                  {currentWeight?.stable 
                    ? <Check size={14} />
                    : <AlertCircle size={14} />
                  }
                  {currentWeight?.stable 
                    ? 'Peso Estável'
                    : currentWeight ? 'Peso Instável' : 'Sem Leitura'
                  }
                </div>
                
                {currentWeight && (
                  <p className="text-sm text-gray-500 mt-2">
                    Última atualização: {currentWeight.timestamp.toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* Weight History */}
              {weightHistory.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                    <RefreshCw size={14} />
                    Histórico de Leituras
                  </h4>
                  <div className="flex justify-between">
                    {weightHistory.map((reading, index) => (
                      <div key={index} className="text-center">
                        <div className={`text-sm font-mono font-bold ${reading.stable ? 'text-green-600' : 'text-gray-500'}`}>
                          {(reading.weight * 1000).toFixed(0)}g
                        </div>
                        <div className="text-xs text-gray-500">
                          {reading.timestamp.toLocaleTimeString().substring(0, 5)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{error}</p>
                    {weightAttempts >= 2 && (
                      <p className="text-xs mt-1">Alternando para modo manual automaticamente...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleRequestWeight}
                disabled={isRequestingWeight || !isScaleConnected}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                title={!isScaleConnected ? "Balança não conectada" : ""}
              >
                {isRequestingWeight ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Aguardando Peso Estável... {weightAttempts > 1 ? `(Tentativa ${weightAttempts})` : ''}</span>
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    <span>Confirmar Peso</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {weightAttempts > 0 
                    ? "Inserir Peso Manualmente (Recomendado)" 
                    : "Inserir Peso Manualmente"}
                </h3>
                <p className="text-sm text-green-600">
                  Digite o peso do produto em gramas (g)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Peso em gramas (g)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={manualWeight}
                    onChange={(e) => setManualWeight(e.target.value)}
                    placeholder="Ex: 500"
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    g
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Digite apenas números, sem pontos ou vírgulas
                </p>
              </div>

              {/* Quick Selection Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[100, 200, 300, 400, 500, 1000].map(weight => (
                  <button
                    key={weight}
                    onClick={() => setManualWeight(weight.toString())}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 font-medium transition-colors"
                  >
                    {weight}g
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                  {error && error.includes("Digite um valor válido") && (
                    <p className="text-xs mt-1">O peso deve ser um número maior que zero.</p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleManualWeightSubmit}
                disabled={!manualWeight}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check size={20} />
                <span>Confirmar Peso Manual</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                const newMode = weightMode === 'scale' ? 'manual' : 'scale';
                setWeightMode(newMode);
                setError(null); // Clear errors when switching modes
                if (newMode === 'scale' && !isScaleConnected) {
                  setError('Balança não conectada. Por favor, use o modo manual.');
                  setWeightMode('manual');
                }
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              {weightMode === 'scale' ? (
                <>
                  <span>Alternar para modo manual</span>
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <span>Alternar para balança</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
            <div className="text-xs text-gray-500">
              {weightMode === 'scale' ? 'Modo Balança' : 'Modo Manual'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScaleWeightModal;