import React, { useState, useEffect, useRef } from 'react';
import { Scale, RefreshCw, Check, AlertCircle, X, Info, Settings } from 'lucide-react';
import { ScaleConnection, WeightReading } from '../../types/pdv';

interface ScaleTestPanelProps {
  // Scale state
  connection: ScaleConnection;
  currentWeight: WeightReading | null;
  isReading: boolean;
  lastError: string | null;
  reconnecting: boolean;
  scaleConfig: {
    baudRate: number;
    dataBits: number;
    protocol: string;
    stopBits: number;
    parity: string;
    flowControl: string;
    reconnectInterval: number;
    stableWeightTimeout: number;
    weightPattern: RegExp;
  };
  availablePorts: string[];
  
  // Scale methods
  connect: (portName?: string) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  requestStableWeight: () => Promise<number | null>;
  updateConfig: (newConfig: Partial<typeof scaleConfig>) => void;
  simulateWeight: (weight: number) => WeightReading;
  listAvailablePorts: () => Promise<string[]>;
  
  // Panel callbacks
  onClose: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  keepConnectionOnClose?: boolean;
}

const ScaleTestPanel: React.FC<ScaleTestPanelProps> = ({ 
  connection,
  currentWeight,
  isReading,
  lastError,
  reconnecting,
  scaleConfig,
  availablePorts,
  connect,
  disconnect,
  requestStableWeight,
  updateConfig,
  simulateWeight,
  listAvailablePorts,
  onClose,
  onConnect,
  onDisconnect,
  keepConnectionOnClose = true
}) => {
  const [manualWeight, setManualWeight] = useState<string>('');
  const [rawData, setRawData] = useState<string[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('PRT2');
  const [readingStableWeight, setReadingStableWeight] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [selectedPort, setSelectedPort] = useState<string>('');
  
  // Update the UI to show the current baud rate is 4800
  useEffect(() => {
    if (scaleConfig && scaleConfig.baudRate) {
      console.log('Current scale baud rate:', scaleConfig.baudRate);
    }
  }, [scaleConfig]);
  const [sendingCommand, setSendingCommand] = useState<boolean>(false);
  
  const rawDataRef = useRef<HTMLDivElement>(null);

  // Update raw data when weight changes
  useEffect(() => {
    if (currentWeight) {
      const timestamp = new Date().toLocaleTimeString();
      const weightStr = `${timestamp} - ${currentWeight.stable ? 'ST' : 'US'},GS,${currentWeight.weight < 0 ? '-' : '+'}${(currentWeight.weight * 1000).toFixed(0).padStart(5, '0')}g`;
      setRawData(prev => [...prev.slice(-19), weightStr]);
    }
  }, [currentWeight]);

  // Auto-scroll raw data
  useEffect(() => {
    if (rawDataRef.current) {
      rawDataRef.current.scrollTop = rawDataRef.current.scrollHeight;
    }
  }, [rawData]);

  // Update protocol in scale config when it changes
  useEffect(() => {
    updateConfig({
      protocol: selectedProtocol 
    });
    
    // Add to raw data log
    setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔄 Protocolo alterado para ${selectedProtocol}`]);
  }, [selectedProtocol, updateConfig]);

  // Load available ports on component mount
  useEffect(() => {
    listAvailablePorts().then((ports) => {
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔍 Buscando portas disponíveis...`]);
      if (ports.length > 0) {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ ${ports.length} portas encontradas: ${ports.join(', ')}`]);
      } else {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ⚠️ Nenhuma porta encontrada. Verifique se a balança está conectada.`]);
      }
    });
  }, [listAvailablePorts]);

  // Test connection
  const testConnection = async () => {
    setTestingConnection(true);
    setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔍 Iniciando teste de conexão...`]); 
    try {
      // First list available ports
      await listAvailablePorts();
      
      // Primeiro desconectar se já estiver conectado
      if (connection.isConnected) {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔌 Desconectando balança atual...`]);
        await disconnect();
        if (onDisconnect) onDisconnect();
        // Aguardar um pouco para garantir que a porta foi liberada
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔌 Tentando conectar à balança...`]);
      const success = await connect();
      if (success) {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ Conexão estabelecida com sucesso! Status: ${connection.isConnected ? 'Conectado' : 'Desconectado'}`]);
        if (onConnect) onConnect();
        
        // Forçar atualização do estado após conexão bem-sucedida
        setTimeout(() => {
          setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔄 Verificando status da conexão: ${connection.isConnected ? 'Conectado' : 'Desconectado'}`]);
        }, 1000);
      } else {
        const errorLines = (lastError || 'Erro desconhecido').split('\n');
        errorLines.forEach(line => {
          setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ ${line}`]);
        });
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorLines = errorMessage.split('\n');
      errorLines.forEach(line => {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ ${line}`]);
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Send command to request weight
  const sendWeightCommand = async () => {
    if (!connection.isConnected) {
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ⚠️ Balança não conectada para enviar comando.`]); 
      return;
    }
    
    setSendingCommand(true);
    try {
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 📤 Enviando comando para solicitar peso (Protocolo ${selectedProtocol})...`]);
      
      // Request stable weight after sending command
      readStableWeight();
      
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ Comando enviado com sucesso`]);
    } catch (error) {
      console.error('Erro ao enviar comando:', error);
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ Erro ao enviar comando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
    } finally {
      setSendingCommand(false);
    }
  };

  // Read stable weight
  const readStableWeight = async () => {
    setReadingStableWeight(true);
    setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔄 Iniciando leitura de peso estável. Status da balança: ${connection.isConnected ? 'Conectado' : 'Desconectado'}`]); 
    try {
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ⏳ Aguardando peso estável...`]);
      const weight = await requestStableWeight();
      if (weight !== null) {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ Peso estável: ${(weight * 1000).toFixed(0)}g`]);
      } else {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ⚠️ Não foi possível obter peso estável`]);
      }
    } catch (error) {
      console.error('Erro ao ler peso estável:', error);
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
    } finally {
      setReadingStableWeight(false);
    }
  };

  // Simulate weight
  const handleSimulateWeight = () => {
    const weight = parseInt(manualWeight);
    if (!isNaN(weight) && weight >= 0) {
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔄 Simulando peso: ${weight}g`]);
      simulateWeight(weight);
      
      // Verificar status após simulação
      setTimeout(() => {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ Simulação concluída. Status da balança: ${connection.isConnected ? 'Conectado' : 'Desconectado'}`]);
      }, 500);
    }
  };

  // Handle port selection and connect
  const handleConnectToPort = async () => {
    if (!selectedPort) {
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ⚠️ Selecione uma porta primeiro`]); 
      return false;
    }

    setTestingConnection(true);
    try {
      // Disconnect if already connected
      if (connection.isConnected) {
        try {
          const disconnected = await disconnect();
          if (disconnected && onDisconnect) {
            onDisconnect();
          }
        } catch (error) {
          console.warn('⚠️ Erro ao desconectar:', error);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔌 Tentando conectar à porta ${selectedPort}...`]); 
      
      // Connect with the selected port
      console.log(`🔌 Conectando à porta selecionada: ${selectedPort}`);
      const success = await connect(selectedPort); 
      
      if (success) {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ Conexão estabelecida com sucesso na porta ${selectedPort}!`]);
        if (onConnect) {
          onConnect();
        }
        return true;
      } else {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ Falha ao conectar na porta ${selectedPort}`]);
        return false;
      }
    } catch (error) {
      console.error('Erro ao conectar na porta:', error);
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
      return false;
    } finally {
      setTestingConnection(false);
    }
    return false;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Scale size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Teste de Balança</h2>
              <p className="text-gray-600">Toledo Prix 3 Fit</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={() => {
                // Don't disconnect when closing if keepConnectionOnClose is true
                if (!keepConnectionOnClose && connection.isConnected) {
                  disconnect().then(() => {
                    if (onDisconnect) onDisconnect();
                  });
                }
                onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Weight Display */}
          <div className="space-y-6">
            {/* Current Weight Display */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Leitura de Peso</h3>
              
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
              
              <div className="mt-4">
                <button
                  onClick={sendWeightCommand}
                  disabled={!connection.isConnected || sendingCommand || readingStableWeight}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  {sendingCommand ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enviando Comando {selectedProtocol}...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Enviar Comando {selectedProtocol === 'PRT2' ? 'ESC+P' : selectedProtocol}
                    </>
                  )}
                </button>
                
                <button
                  onClick={readStableWeight}
                  disabled={!connection.isConnected || readingStableWeight}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {readingStableWeight ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Aguardando Peso Estável...
                    </>
                  ) : (
                    <>
                      <Scale size={18} />
                      Ler Peso Estável
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Connection Status */}
            <div className={`rounded-lg p-4 border ${
              connection.isConnected 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`text-lg font-medium mb-2 flex items-center gap-2 ${
                connection.isConnected ? 'text-green-800' : 'text-red-800'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  connection.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                Status da Balança {connection.isConnected ? '(Conectada)' : '(Desconectada)'}
              </h3>
              
              <div className="space-y-2">
                <p className={connection.isConnected ? 'text-green-700' : 'text-red-700'}>
                  {connection.isConnected 
                    ? 'Balança conectada' 
                    : 'Balança desconectada'
                  }
                </p>
                
                {connection.isConnected && connection.port && (
                  <p className="text-sm text-green-600">
                    Porta: {connection.port}
                  </p>
                )}
                
                {connection.isConnected && connection.model && (
                  <p className="text-sm text-green-600">
                    Modelo: {connection.model}
                  </p>
                )}
                
                {lastError && (
                  <div className="text-sm text-red-600">
                    <AlertCircle size={14} className="inline-block mr-1" />
                    <div className="mt-1 whitespace-pre-line">
                      {lastError}
                    </div>
                  </div>
                )}
                
                {reconnecting && (
                  <p className="text-sm text-yellow-600 flex items-center gap-1">
                    <RefreshCw size={14} className="animate-spin" />
                    Tentando reconectar...
                  </p>
                )}
              </div>
              
              <div className="mt-4">
                {/* Port Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione a porta da balança:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedPort}
                      onChange={(e) => setSelectedPort(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma porta</option>
                      {availablePorts.map(port => (
                        <option key={port} value={port}>{port}</option>
                      ))}
                    </select>
                    <button
                      onClick={listAvailablePorts}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                      title="Atualizar lista de portas"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap mb-2"
                >
                  {testingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Buscando portas...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Buscar Portas
                    </>
                  )}
                </button>
                
                {/* Botão de Diagnóstico */}
                <button
                  onClick={() => {
                    setRawData(prev => [
                      ...prev, 
                      `${new Date().toLocaleTimeString()} - 🔍 DIAGNÓSTICO:`,
                      `${new Date().toLocaleTimeString()} - 🔌 Status da conexão: ${connection.isConnected ? 'Conectado' : 'Desconectado'}`,
                      `${new Date().toLocaleTimeString()} - 📊 Porta: ${connection.port || 'Nenhuma'}`,
                      `${new Date().toLocaleTimeString()} - 📊 Modelo: ${connection.model || 'Nenhum'}`,
                      `${new Date().toLocaleTimeString()} - 📊 Erro: ${connection.error || 'Nenhum'}`,
                      `${new Date().toLocaleTimeString()} - 🔄 Reconectando: ${reconnecting ? 'Sim' : 'Não'}`,
                      `${new Date().toLocaleTimeString()} - 🔄 Lendo: ${isReading ? 'Sim' : 'Não'}`
                    ]);
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mb-2"
                >
                  <Info size={16} />
                  Diagnóstico de Conexão
                </button>
                
                <div className="flex gap-2">
                  {connection.isConnected ? (
                    <button
                      onClick={() => {
                        disconnect().then(() => {
                          if (onDisconnect) onDisconnect(); 
                        });
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        connect().then(success => {
                          if (success && onConnect) onConnect(); 
                        });
                      }}
                      disabled={testingConnection}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 rounded-lg transition-colors"
                    >
                      Conectar
                    </button>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">Status da Balança</h4>
                  {connection.isConnected && (
                    <p className="text-xs text-blue-600">Protocolo: {selectedProtocol}</p>
                  )}
                </div>
              </div>
            </div>
              {/* Protocol Selection */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Protocolo da Balança
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedProtocol}
                    onChange={(e) => setSelectedProtocol(e.target.value)}
                    className="flex-1 p-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="PRT1">PRT1</option>
                    <option value="PRT2">PRT2 (padrão)</option>
                    <option value="PRT3">PRT3</option>
                    <option value="PRT4">PRT4</option>
                    <option value="PRT5">PRT5</option>
                  </select>
                  <div className="bg-blue-100 p-2 rounded-lg flex items-center">
                    <Settings size={20} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Selecione o protocolo de comunicação da sua balança Toledo
                </p>
              </div>
              
          </div>

          {/* Right Column - Raw Data and Simulation */}
          <div className="space-y-6">
            {/* Raw Data Console */}
            <div className="bg-gray-900 rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Console de Dados
                </h3>
              </div>
              
              <div 
                ref={rawDataRef}
                className="p-3 h-64 overflow-y-auto font-mono text-xs text-green-400 bg-gray-900"
              >
                {rawData.length === 0 ? (
                  <div className="text-gray-500 italic">
                    Aguardando dados da balança...
                  </div>
                ) : (
                  rawData.map((line, index) => (
                    <div key={index} className="mb-1">{line}</div>
                  ))
                )}
              </div>
            </div>

            {/* Weight Simulation */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Simulação de Peso</h3>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={manualWeight}
                  onChange={(e) => setManualWeight(e.target.value)}
                  placeholder="Peso em gramas"
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSimulateWeight}
                  disabled={!manualWeight}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Simular
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Útil para testes quando a balança não está disponível
              </p>
            </div>

            {/* Protocol Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                Informações do Protocolo
                <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                  <Settings size={12} />
                  {selectedProtocol}
                </span>
              </h3>
              {selectedProtocol === 'PRT2' ? (
                <div className="space-y-1 text-sm text-blue-700">
                  <p><strong>Formato:</strong> ST,GS,+00.000kg ou P,+00.000kg</p>
                  <p><strong>ST/US:</strong> Estável/Instável</p>
                  <p><strong>GS/NT:</strong> Peso Bruto/Líquido</p>
                  <p><strong>+/-:</strong> Sinal do peso</p>
                  <p><strong>00.000:</strong> Valor do peso</p>
                  <p><strong>kg/g:</strong> Unidade de medida</p>
                  <p><strong>Comando:</strong> Envie 'ESC+P' (\x1BP) para solicitar o peso</p>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-blue-700">
                  <p><strong>Protocolo {selectedProtocol}:</strong> Formato específico para balanças Toledo</p>
                  <p><strong>Nota:</strong> Este protocolo está configurado para uso futuro</p>
                  <p><strong>Implementação:</strong> Atualmente apenas o protocolo PRT2 está totalmente implementado</p>
                </div>
              )}
              
              <div className="mt-3 p-2 bg-blue-100/50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> A balança Toledo Prix 3 Fit exige que você envie um comando para solicitar o peso.
                  Use o botão "Enviar Comando\" para solicitar o peso atual da balança.
                </p>
              </div>
              
              <div className="mt-3 p-2 bg-yellow-100 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Importante:</strong> Balanças Toledo Prix 3 Fit geralmente não enviam dados automaticamente.
                  {selectedProtocol === 'PRT2' ? (
                    <> É necessário enviar o comando 'ESC+P' (\x1BP) para solicitar o peso atual no protocolo PRT2.</>
                  ) : (
                    <> O protocolo {selectedProtocol} está configurado para uso futuro.</>
                  )}
                </p>
              </div>
              
              <div className="mt-3 p-2 bg-yellow-100/50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  <strong>Solução de Problemas:</strong><br/>
                  • Verifique se a balança está ligada e conectada via USB<br/>
                  • Feche outros programas que possam estar usando a porta<br/>
                  • Conceda permissão quando o navegador solicitar<br/>
                  • Tente desconectar e reconectar o cabo USB
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScaleTestPanel;