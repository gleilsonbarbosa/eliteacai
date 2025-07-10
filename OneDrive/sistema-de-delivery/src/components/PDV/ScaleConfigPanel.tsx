import React, { useState, useEffect, useRef } from 'react';
import { Scale, Settings, RefreshCw, Check, AlertCircle, Save, X, Info } from 'lucide-react';
import { useScale } from '../../hooks/useScale';

interface ScaleConfigPanelProps {
  onClose: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  keepConnectionOnClose?: boolean;
}

const ScaleConfigPanel: React.FC<ScaleConfigPanelProps> = ({ 
  onClose,
  onConnect,
  onDisconnect,
  keepConnectionOnClose = true
}) => {
  const { 
    connection,
    availablePorts,
    currentWeight, 
    isReading, 
    lastError, 
    reconnecting,
    scaleConfig,
    connect, 
    disconnect, 
    listAvailablePorts,
    requestStableWeight, 
    simulateWeight,
    updateConfig
  } = useScale();

  // Configuration state
  const [baudRate, setBaudRate] = useState<number>(4800); // Changed from scaleConfig.baudRate to 4800
  const [dataBits, setDataBits] = useState<number>(scaleConfig.dataBits);
  const [stopBits, setStopBits] = useState<number>(scaleConfig.stopBits);
  const [parity, setParity] = useState<string>(scaleConfig.parity);
  const [flowControl, setFlowControl] = useState<string>(scaleConfig.flowControl);
  const [port, setPort] = useState<string>('');
  const [manualWeight, setManualWeight] = useState<string>('');
  const [showPortSelection, setShowPortSelection] = useState(false);
  const [rawData, setRawData] = useState<string[]>([]);
  const [showRawData, setShowRawData] = useState<boolean>(true);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('PRT2');
  const [autoReconnect, setAutoReconnect] = useState<boolean>(scaleConfig.reconnectInterval > 0);
  const [stableTimeout, setStableTimeout] = useState<number>(scaleConfig.stableWeightTimeout);
  const [configChanged, setConfigChanged] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [readingStableWeight, setReadingStableWeight] = useState<boolean>(false);
  const [savedConfig, setSavedConfig] = useState<boolean>(false);
  
  const rawDataRef = useRef<HTMLDivElement>(null);

  // Baud rate options
  const baudRateOptions = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]; // 4800 is now the default
  
  // Protocol options
  const protocolOptions = [
    { value: 'PRT1', label: 'PRT1' },
    { value: 'PRT2', label: 'PRT2 (padrão)' },
    { value: 'PRT3', label: 'PRT3' },
    { value: 'PRT4', label: 'PRT4' },
    { value: 'PRT5', label: 'PRT5' }
  ];
  
  // Data bits options
  const dataBitsOptions = [7, 8];
  
  // Stop bits options
  const stopBitsOptions = [1, 2];
  
  // Parity options
  const parityOptions = [
    { value: 'none', label: 'Nenhuma' },
    { value: 'even', label: 'Par' },
    { value: 'odd', label: 'Ímpar' }
  ];
  
  // Flow control options
  const flowControlOptions = [
    { value: 'none', label: 'Nenhum' },
    { value: 'hardware', label: 'RTS/CTS' },
    { value: 'software', label: 'XON/XOFF' }
  ];

  // Load saved configuration from localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('scale_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setBaudRate(config.baudRate || 9600);
        setDataBits(config.dataBits || 8);
        setStopBits(config.stopBits || 1);
        setSelectedProtocol(config.protocol || 'PRT2');
        setParity(config.parity || 'none');
        setFlowControl(config.flowControl || 'none');
        setPort(config.port || '');
        setAutoReconnect(config.autoReconnect !== undefined ? config.autoReconnect : true);
        setStableTimeout(config.stableTimeout || 5000);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da balança:', error);
    }
  }, []);

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

  // Check if config has changed
  useEffect(() => {
    const savedConfig = localStorage.getItem('scale_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      const hasChanged = 
        config.baudRate !== baudRate ||
        config.dataBits !== dataBits ||
        config.stopBits !== stopBits ||
        config.protocol !== selectedProtocol ||
        config.parity !== parity ||
        config.flowControl !== flowControl ||
        config.port !== port ||
        config.autoReconnect !== autoReconnect ||
        config.stableTimeout !== stableTimeout;
      
      setConfigChanged(hasChanged);
    } else {
      setConfigChanged(true);
    }
  }, [baudRate, dataBits, stopBits, parity, flowControl, port, autoReconnect, stableTimeout]);

  // Update protocol in scale config when it changes
  useEffect(() => {
    updateConfig({
      protocol: selectedProtocol
    });
    
    // Add to raw data log
    setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔄 Protocolo alterado para ${selectedProtocol}`]);
  }, [selectedProtocol, updateConfig]);

  // Save configuration
  const saveConfig = () => {
    try {
      const config = {
        baudRate,
        dataBits,
        stopBits,
        protocol: selectedProtocol,
        parity,
        flowControl,
        port,
        autoReconnect,
        stableTimeout
      };
      localStorage.setItem('scale_config', JSON.stringify(config));
      
      // Update the scale configuration
      updateConfig({
        baudRate,
        protocol: selectedProtocol,
        dataBits,
        stopBits,
        parity,
        flowControl,
        reconnectInterval: autoReconnect ? 3000 : 0,
        stableWeightTimeout: stableTimeout
      });
      
      setConfigChanged(false);
      setSavedConfig(true);
      setTimeout(() => setSavedConfig(false), 3000);
      
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ Configurações salvas com sucesso`]);
    } catch (error) {
      console.error('Erro ao salvar configurações da balança:', error);
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ Erro ao salvar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
    }
  };

  // Test connection
  const testConnection = async () => {
    setTestingConnection(true);
    try {
      if (connection.isConnected) {
        await disconnect();
        if (onDisconnect) onDisconnect();
      }
      
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔌 Tentando conectar à balança...`]);
      const success = await connect();
      if (success) {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ Conexão estabelecida com sucesso!`]);
        if (onConnect) onConnect();
      } else {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ Falha ao conectar: ${lastError || 'Erro desconhecido'}`]);
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
    } finally {
      setTestingConnection(false);
    }
  };

  // Read stable weight
  const readStableWeight = async () => {
    setReadingStableWeight(true);
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
      simulateWeight(weight);
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔄 Peso simulado: ${weight}g`]);
    }
  };

  // Detect available ports (mock function)
  const detectPorts = () => {
    // In a real implementation, this would use navigator.serial.getPorts()
    listAvailablePorts().then(ports => {
      setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - 🔍 Buscando portas disponíveis...`]);
      if (ports.length > 0) {
        setShowPortSelection(true);
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ✅ ${ports.length} portas encontradas: ${ports.join(', ')}`]);
      } else {
        setRawData(prev => [...prev, `${new Date().toLocaleTimeString()} - ⚠️ Nenhuma porta encontrada. Verifique se a balança está conectada.`]);
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Scale size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Configuração da Balança</h2>
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
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-800 mb-4 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Parâmetros de Comunicação
              </h3>

              <div className="space-y-4">
                {/* Baud Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Velocidade (Baud Rate)
                  </label>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {baudRateOptions.map(rate => (
                      <option key={rate} value={rate}>{rate}</option>
                    ))}
                  </select>
                </div>

                {/* Protocol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protocolo da Balança
                  </label>
                  <select
                    value={selectedProtocol}
                    onChange={(e) => setSelectedProtocol(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {protocolOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Data Bits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bits de Dados
                  </label>
                  <select
                    value={dataBits}
                    onChange={(e) => setDataBits(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dataBitsOptions.map(bits => (
                      <option key={bits} value={bits}>{bits}</option>
                    ))}
                  </select>
                </div>

                {/* Stop Bits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bits de Parada
                  </label>
                  <select
                    value={stopBits}
                    onChange={(e) => setStopBits(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stopBitsOptions.map(bits => (
                      <option key={bits} value={bits}>{bits}</option>
                    ))}
                  </select>
                </div>

                {/* Parity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paridade
                  </label>
                  <select
                    value={parity}
                    onChange={(e) => setParity(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {parityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Flow Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Controle de Fluxo
                  </label>
                  <select
                    value={flowControl}
                    onChange={(e) => setFlowControl(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {flowControlOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Port */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porta Serial
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Selecionar porta</option>
                      {availablePorts.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button
                      onClick={detectPorts}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                      title="Detectar portas"
                    >
                      <RefreshCw size={16} />
                      <span>Detectar</span>
                    </button>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="pt-4 border-t border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-3">Configurações Avançadas</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoReconnect}
                        onChange={(e) => setAutoReconnect(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        Reconexão automática
                      </span>
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timeout para peso estável (ms)
                      </label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        value={stableTimeout}
                        onChange={(e) => setStableTimeout(parseInt(e.target.value) || 5000)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Config Button */}
                <div className="pt-4">
                  <button
                    onClick={saveConfig}
                    disabled={!configChanged}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      configChanged 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } ${savedConfig ? 'bg-green-700' : ''}`}
                  >
                    {savedConfig ? (
                      <>
                        <Check size={16} />
                        Configurações Salvas
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
                Status da Balança
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
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {lastError}
                  </p>
                )}
                
                {reconnecting && (
                  <p className="text-sm text-yellow-600 flex items-center gap-1">
                    <RefreshCw size={14} className="animate-spin" />
                    Tentando reconectar...
                  </p>
                )}
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
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
          </div>

          {/* Right Column - Weight Display and Raw Data */}
          <div className="space-y-6">
            {/* Current Weight Display */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Leitura de Peso</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2 font-mono">
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

            {/* Raw Data Console */}
            <div className="bg-gray-900 rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Console de Dados
                </h3>
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="text-gray-400 hover:text-white"
                >
                  {showRawData ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              
              {showRawData && (
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
              )}
            </div>

            {/* Protocol Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                Informações do Protocolo
              </h3>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Formato:</strong> ST,GS,+00.000kg</p>
                <p><strong>ST/US:</strong> Estável/Instável</p>
                <p><strong>GS/NT:</strong> Peso Bruto/Líquido</p>
                <p><strong>+/-:</strong> Sinal do peso</p>
                <p><strong>00.000:</strong> Valor do peso</p>
                <p><strong>kg/g:</strong> Unidade de medida</p>
              </div>
              
              <div className="mt-3 p-2 bg-blue-100/50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> A balança Toledo Prix 3 Fit utiliza o protocolo padrão de comunicação serial.
                  Certifique-se de que a balança esteja configurada com os mesmos parâmetros definidos aqui.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScaleConfigPanel;