import { useState, useEffect, useCallback, useRef } from 'react';
import { WeightReading, ScaleConnection } from '../types/pdv'; 

// Mock available ports for development/testing
const MOCK_AVAILABLE_PORTS = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', '/dev/ttyUSB0', '/dev/ttyS0', '/dev/ttyACM0'];

export const useScale = () => {
  const [connection, setConnection] = useState<ScaleConnection>({
    isConnected: false
  });
  const [currentWeight, setCurrentWeight] = useState<WeightReading | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null); 
  const reconnectTimerRef = useRef<number | null>(null);
  const stableWeightTimerRef = useRef<number | null>(null);
  const lastWeightRef = useRef<WeightReading | null>(null);
  const selectedPortRef = useRef<string | null>(null);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  
  // Create refs to break circular dependency
  const startReadingRef = useRef<(() => Promise<void>) | null>(null);
  const reconnectRef = useRef<(() => Promise<void>) | null>(null);
  
  const [scaleConfig, setScaleConfig] = useState({
    baudRate: 4800, // Changed from 9600 to 4800
    dataBits: 8,
    protocol: 'PRT2',
    stopBits: 1,
    parity: 'none' as const,
    flowControl: 'none' as const,
    reconnectInterval: 3000, // Intervalo de reconexão em ms
    stableWeightTimeout: 5000, // Timeout para peso estável em ms
    weightPattern: /([ST|US]),([GS|NT]),([+-])(\d+\.?\d*)(kg|g)/i, // Padrão para reconhecer o peso
  });

  // Centralized cleanup function for serial port resources
  const cleanupSerialPort = useCallback(async () => {
    console.log('🧹 Limpando recursos da porta serial...');
    
    // If we want to keep the connection, just clean up readers
    const keepConnection = true; // Set to true to maintain connection
    
    if (keepConnection && connection.isConnected) {
      console.log('🔌 Mantendo a conexão da balança ativa...');
      
      // Only clean up readers, not the port
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
          console.log('✅ Reader cancelado com sucesso (mantendo conexão)');
        } catch (error) {
          console.warn('⚠️ Erro ao cancelar reader:', error);
        } finally {
          readerRef.current = null;
        }
      }
      
      // Clear timers
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      if (stableWeightTimerRef.current) {
        clearTimeout(stableWeightTimerRef.current);
        stableWeightTimerRef.current = null;
      }
      
      setIsReading(false);
      return;
    }
    
    // Stop reading flag
    setIsReading(false);
    
    // Clear timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }
    
    // Cancel and release reader
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
        console.log('✅ Reader cancelado com sucesso');
      } catch (error) {
        console.warn('⚠️ Erro ao cancelar reader:', error);
      } finally {
        readerRef.current = null;
      }
    }
    
    // Close and release port
    if (portRef.current) {
      try {
        // Check if port is still open before trying to close
        if (portRef.current.readable || portRef.current.writable) {
          await portRef.current.close();
          console.log('✅ Porta serial fechada com sucesso');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao fechar porta serial:', error);
      } finally {
        portRef.current = null;
      }
    }
    
    console.log('✅ Limpeza de recursos concluída');
  }, []);

  // Carregar configurações salvas
  useEffect(() => {
    try {
      // Default configuration
      const defaultConfig = {
        baudRate: 4800, // Changed from 9600 to 4800
        dataBits: 8,
        stopBits: 1,
        protocol: 'PRT2',
        parity: 'none',
        flowControl: 'none',
        stableTimeout: 5000,
        autoReconnect: true
      };
      
      const savedConfig = localStorage.getItem('scale_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setScaleConfig(prev => ({
          ...prev,
          baudRate: config.baudRate || 4800, // Default to 4800 if not specified
          dataBits: config.dataBits || 8,
          stopBits: config.stopBits || 1,
          protocol: config.protocol || 'PRT2',
          parity: config.parity || 'none',
          stableWeightTimeout: config.stableTimeout || 5000,
          reconnectInterval: config.autoReconnect ? 3000 : 0
        }));
      } else {
        // If no saved config, use the new default with 4800 baud rate
        setScaleConfig(prev => ({
          ...prev,
          baudRate: defaultConfig.baudRate,
          dataBits: defaultConfig.dataBits,
          stopBits: defaultConfig.stopBits,
          protocol: defaultConfig.protocol,
          parity: defaultConfig.parity,
          stableWeightTimeout: defaultConfig.stableTimeout,
          reconnectInterval: defaultConfig.autoReconnect ? 3000 : 0
        }));
        
        // Save the default config to localStorage
        localStorage.setItem('scale_config', JSON.stringify(defaultConfig));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da balança:', error);
    }
  }, []);

  // Verificar se Web Serial API está disponível
  const isWebSerialSupported = useCallback(() => {
    const supported = 'serial' in navigator;
    if (!supported && typeof window !== 'undefined') {
      console.warn('⚠️ Web Serial API não suportada neste navegador. Usando modo de simulação.');
    }
    return supported;
  }, []);

  // Function to list available ports
  const listAvailablePorts = useCallback(async () => {
    try {
      if (!isWebSerialSupported() || typeof window === 'undefined') {
        console.warn('⚠️ Web Serial API not supported, using mock ports');
        setAvailablePorts(MOCK_AVAILABLE_PORTS);
        return MOCK_AVAILABLE_PORTS;
      }

      try {
        // Try to get ports from navigator.serial
        const ports = await navigator.serial.getPorts();
        
        if (ports.length > 0) {
          console.log('✅ Found', ports.length, 'serial ports');
          // We can't get the actual port names due to security restrictions
          // So we'll just use generic names with info we can get
          const portNames = ports.map((port, index) => {
            const info = port.getInfo();
            return `Port ${index + 1}${info.usbProductId ? ` (ID: ${info.usbProductId})` : ''}`;
          });
          setAvailablePorts(portNames);
          return portNames;
        } else {
          console.log('⚠️ No serial ports found, using mock ports');
          setAvailablePorts(MOCK_AVAILABLE_PORTS);
          return MOCK_AVAILABLE_PORTS;
        }
      } catch (serialError) {
        console.error('❌ Error accessing serial ports:', serialError);
        // Fall back to mock ports
        setAvailablePorts(MOCK_AVAILABLE_PORTS);
        return MOCK_AVAILABLE_PORTS;
      }
    } catch (error) {
      console.error('❌ Error listing ports:', error);
      setAvailablePorts(MOCK_AVAILABLE_PORTS);
      return MOCK_AVAILABLE_PORTS;
    }
  }, [isWebSerialSupported]);

  // Iniciar leitura contínua do peso
  const startReading = useCallback(async () => {
    // Cleanup any existing resources before starting
    if (isReading || readerRef.current) {
      console.log('🧹 Limpando recursos existentes antes de iniciar nova leitura...');
      await cleanupSerialPort();
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!portRef.current) {
      console.warn('⚠️ Porta serial não disponível para leitura');
      return;
    }

    console.log('📊 Iniciando leitura contínua da balança...', {
      portExists: !!portRef.current,
      isReading,
      connectionStatus: connection.isConnected
    });
    
    setIsReading(true);
    
    // Define a function to send weight command
    const requestWeightFromScale = async () => {
      try {
        if (portRef.current && portRef.current.writable) {
          const writer = portRef.current.writable.getWriter();
          const encoder = new TextEncoder();
          
          // Send command based on protocol
          if (scaleConfig.protocol === 'PRT2') {
            // Send ESC+P command for PRT2 protocol
            await writer.write(encoder.encode('\x1BP'));
            console.log('📤 Comando ESC+P enviado para a balança (Protocolo PRT2)');
          } else {
            // For other protocols, we'll implement specific commands in the future
            // For now, just log a message
            console.log(`📤 Protocolo ${scaleConfig.protocol} selecionado (implementação futura)`);
            
            // Send a generic command for testing
            await writer.write(encoder.encode('\x1BP'));
            console.log(`📤 Enviando comando genérico para protocolo ${scaleConfig.protocol}`);
          }
          
          // Release the writer so we can read the response
          writer.releaseLock();
        }
      } catch (error) {
        console.error('❌ Erro ao enviar comando para balança:', error);
      }
    };


    try {
      // Send initial command to request weight with PRT2 protocol
      await requestWeightFromScale();
      
      const reader = portRef.current.readable?.getReader();
      if (!reader) throw new Error('Não foi possível obter reader da porta');

      readerRef.current = reader;

      // Set up interval to periodically request weight
      const commandInterval = setInterval(async () => {
        if (isReading && portRef.current) {
          await requestWeightFromScale();
        } else {
          clearInterval(commandInterval);
        }
      }, 1000); // Request weight every second

      while (isReading && portRef.current) {
        try {
          const { value, done } = await reader.read();
          
          if (done) break;

          // Decodificar dados da balança Toledo
          const data = new TextDecoder().decode(value);
          console.log('📡 Dados recebidos da balança:', data);
          const weight = parseToledoWeight(data);
          
          if (weight) {
            const reading: WeightReading = {
              weight: weight.value,
              stable: weight.stable,
              unit: weight.unit,
              timestamp: new Date()
            };
            
            // Armazenar o último peso lido
            lastWeightRef.current = reading;
            
            setCurrentWeight(reading);
            setConnection(prev => ({
              ...prev,
              lastReading: reading,
              error: null
            }));
            
            console.log(`⚖️ Peso lido: ${(weight.value * 1000).toFixed(0)}g (${weight.stable ? 'estável' : 'instável'})`);
          }
        } catch (readError) {
          console.error('❌ Erro na leitura da balança:', readError);
          setLastError(readError instanceof Error ? readError.message : 'Erro na leitura');
          
          // Tentar reconectar automaticamente
          if (reconnectRef.current) {
            await reconnectRef.current();
          }
          // Continuar tentando ler
          
          // Clear the command interval if we're no longer reading
          clearInterval(commandInterval);
          break; // Exit the reading loop to prevent further errors
        }
      }
      
      // Clean up the interval when we're done reading
      clearInterval(commandInterval);
    } catch (error) {
      console.error('❌ Erro ao iniciar leitura da balança:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro na comunicação com a balança';
      setConnection(prev => ({
        ...prev,
        error: errorMessage
      }));
      setLastError(errorMessage);
      
      // Tentar reconectar automaticamente
      if (reconnectRef.current) {
        await reconnectRef.current();
      }
    } finally {
      // Ensure cleanup happens even if an error occurs
      if (!connection.isConnected) {
        await cleanupSerialPort();
      }
    }
  }, [cleanupSerialPort, isReading, connection.isConnected, scaleConfig.protocol]);

  
  // Função para reconexão automática
  const reconnect = useCallback(async () => {
    if (reconnecting) return;

    setReconnecting(true);
    console.log('🔄 Iniciando processo de reconexão automática...');
    
    try {
      // Use centralized cleanup
      await cleanupSerialPort();
      
      setConnection(prev => ({
        ...prev,
        isConnected: false,
        error: 'Reconectando...'
      }));
      
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Agendar tentativa de reconexão
      reconnectTimerRef.current = window.setTimeout(async () => {
        // Se a reconexão automática estiver desativada, não tente reconectar
        if (scaleConfig.reconnectInterval === 0) {
          setReconnecting(false);
          return;
        }
        
        try {
          // Tentar reconectar à última porta usada
          if (portRef.current) {
            await portRef.current.open({
              baudRate: scaleConfig.baudRate,
              dataBits: scaleConfig.dataBits,
              protocol: scaleConfig.protocol,
              stopBits: scaleConfig.stopBits,
              parity: scaleConfig.parity,
              flowControl: scaleConfig.flowControl
            });
            
            setConnection({
              isConnected: true,
              port: portRef.current.getInfo().usbProductId?.toString() || 'Desconhecido',
              protocol: scaleConfig.protocol,
              model: 'Toledo Prix 3 Fit',
              error: null
            });
            
            setLastError(null);
            if (startReadingRef.current) {
              startReadingRef.current();
            }
            console.log('✅ Reconexão automática bem-sucedida!');
          } else {
            console.log('⚠️ Não foi possível reconectar: porta não disponível');
            setConnection(prev => ({
              ...prev,
              error: 'Balança desconectada. Tente conectar novamente.'
            }));
          }
        } catch (error) {
          console.error('❌ Falha na reconexão automática:', error);
          setConnection(prev => ({
            ...prev,
            error: 'Falha na reconexão. Tente conectar manualmente.'
          }));
        } finally {
          setReconnecting(false);
        }
      }, scaleConfig.reconnectInterval);
    } catch (error) {
      console.error('❌ Erro no processo de reconexão:', error);
      setReconnecting(false);
    }
  }, [reconnecting, scaleConfig, cleanupSerialPort]);

  // Automatically start reading when connection is established
  useEffect(() => {
    if (connection.isConnected && !isReading) {
      console.log('🔄 Conexão estabelecida, iniciando leitura automática');
      if (startReadingRef.current) {
        startReadingRef.current();
      }
    }
  }, [connection.isConnected, isReading]);

  // Conectar à balança Toledo Prix 3 Fit
  const connect = useCallback(async (portName?: string): Promise<boolean> => {
    if (!isWebSerialSupported() || typeof window === 'undefined') {
      console.log('⚠️ Web Serial API não suportada, não é possível conectar à balança');
      setConnection(prev => ({
        ...prev,
        isConnected: false,
        error: 'Web Serial API não suportada neste navegador'
      }));
      setLastError('Web Serial API não suportada neste navegador');
      return false;
    }

    // Cleanup any existing connections first
    await cleanupSerialPort();
    
    try {
      console.log('🔌 Tentando conectar à balança Toledo Prix 3 Fit...');
      
      // If we already have a selected port, use it
      if (portName) {
        selectedPortRef.current = portName;
      }
      
      try {
        // Solicitar acesso à porta serial
        let port;
        
        // If we have a selected port, use it directly
        if (selectedPortRef.current) {
          console.log(`🔌 Usando porta previamente selecionada: ${selectedPortRef.current}`);
          port = await navigator.serial.requestPort();
          selectedPortRef.current = null; // Clear after use
        } else {
          port = await navigator.serial.requestPort({
            filters: [
              // Filtros para balanças Toledo comuns
              { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
              { usbVendorId: 0x067B }, // Prolific
              { usbVendorId: 0x10C4 }, // Silicon Labs
              // Adicionar mais filtros para cobrir mais dispositivos
              { usbVendorId: 0x1A86 }, // QinHeng Electronics
              { usbVendorId: 0x0557 }, // ATEN
              { usbVendorId: 0x0483 }, // STMicroelectronics
            ]
          });
        }

        // Configurar porta serial para Toledo Prix 3 Fit
        try {
          await port.open({
            baudRate: scaleConfig.baudRate,
            dataBits: scaleConfig.dataBits,
            stopBits: scaleConfig.stopBits,
            protocol: scaleConfig.protocol,
            parity: scaleConfig.parity,
            flowControl: scaleConfig.flowControl
          });
        } catch (openError) {
          // Handle the case where the port is already open
          if (openError instanceof DOMException && openError.message.includes('The port is already open')) {
            console.warn('⚠️ Porta já está aberta, continuando com a conexão existente');
            // Port is already open, we can proceed
          } else {
            // Re-throw other errors
            throw openError;
          }
        }

        portRef.current = port;
        
        console.log('✅ Balança conectada com sucesso!');

        // Atualizar estado de conexão ANTES de iniciar leitura
        // Get port info for better identification
        const portInfo = port.getInfo();
        const portId = portInfo.usbProductId ? 
          `ID: ${portInfo.usbProductId}` : 
          (portInfo.usbVendorId ? `Vendor: ${portInfo.usbVendorId}` : 'Desconhecido');
        
        setConnection({
          isConnected: true,
          port: portId,
          model: 'Toledo Prix 3 Fit',
          protocol: scaleConfig.protocol,
          error: null
        });
        setLastError(null);

        // Iniciar leitura contínua
        setTimeout(() => {
          if (startReadingRef.current) {
            startReadingRef.current();
          }
        }, 500); // Pequeno delay para garantir que o estado foi atualizado

        return true;
      } catch (serialError) {
        // Handle specific serial errors
        let errorMessage = 'Erro ao conectar à balança';
        
        if (serialError instanceof Error) {
          if (serialError.message.includes('Failed to open serial port')) {
            errorMessage = 'Falha ao abrir porta serial. Verifique se:\n• A balança está conectada e ligada\n• Nenhum outro programa está usando a porta\n• Você concedeu permissão ao navegador\n• Tente desconectar e reconectar o cabo USB';
          } else if (serialError.message.includes('No port selected')) {
            errorMessage = 'Nenhuma porta selecionada. Para conectar a balança:\n• Certifique-se de que a balança está conectada via USB\n• Clique em "Conectar" novamente\n• Selecione a porta correta na janela do navegador';
          } else if (serialError.message.includes('Access denied')) {
            errorMessage = 'Acesso negado. Conceda permissão para acessar a porta serial.';
          } else if (serialError.message.includes('Device not found')) {
            errorMessage = 'Dispositivo não encontrado. Verifique se a balança está conectada.';
          } else {
            errorMessage = serialError.message;
          }
        }
        
        console.error('❌ Erro ao conectar balança:', errorMessage);
        setConnection(prev => ({
          ...prev,
          isConnected: false,
          error: errorMessage
        }));
        setLastError(errorMessage);
        return false;
      }
    } catch (error) {
      let errorMessage = 'Erro desconhecido';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to open serial port')) {
          errorMessage = 'Falha ao abrir porta serial. Verifique se:\n• A balança está conectada e ligada\n• Nenhum outro programa está usando a porta\n• Você concedeu permissão ao navegador';
        } else if (error.message.includes('No port selected')) {
          errorMessage = 'Nenhuma porta selecionada. Para conectar a balança:\n• Certifique-se de que a balança está conectada via USB\n• Clique em "Conectar" novamente\n• Selecione a porta correta na janela do navegador';
        } else if (error.message.includes('Access denied')) {
          errorMessage = 'Acesso negado. Conceda permissão para acessar a porta serial.';
        } else if (error.message.includes('Device not found')) {
          errorMessage = 'Dispositivo não encontrado. Verifique se a balança está conectada.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error('❌ Erro ao conectar balança:', errorMessage);
      setConnection(prev => ({
        ...prev,
        isConnected: false,
        error: errorMessage
      }));
      setLastError(errorMessage);
      return false;
    }
  }, [cleanupSerialPort, isWebSerialSupported, scaleConfig]);

  // Desconectar da balança
  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Iniciando desconexão da balança...');
      
      // Set flag to ensure full disconnection
      const forceDisconnect = true;
      
      // Use centralized cleanup
      await cleanupSerialPort();

      // Only update connection state if we're forcing disconnection
      if (forceDisconnect) {
        setConnection({
          isConnected: false,
          error: null
        });
        
        setCurrentWeight(null);
        setLastError(null);
        
        console.log('✅ Balança desconectada com sucesso');
      } else {
        console.log('ℹ️ Mantendo estado de conexão da balança');
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro ao desconectar balança:', errorMessage);
      setLastError(errorMessage);
      return false;
    }
  }, [cleanupSerialPort]);

  // Solicitar peso estável (para produtos pesáveis)
  const requestStableWeight = useCallback(async (): Promise<number | null> => {
    console.log('⚖️ Solicitando peso estável da balança...');
    console.log('🔌 Status da balança:', connection.isConnected ? 'Conectada' : 'Desconectada');
    
    if (!connection.isConnected) {
      console.warn('⚠️ Balança não conectada para solicitar peso estável');
       setLastError('Balança não conectada para solicitar peso estável');
      return null;
    }
    
    // Send command to request weight with PRT2 protocol
    try {
      if (portRef.current && portRef.current.writable) {
        const writer = portRef.current.writable.getWriter();
        const encoder = new TextEncoder();
        
        // Send command based on protocol
        if (scaleConfig.protocol === 'PRT2') {
          // Send ESC+P command for PRT2 protocol
          await writer.write(encoder.encode('\x1BP'));
          console.log('📤 Comando ESC+P enviado para a balança (Protocolo PRT2)');
        } else {
          // For other protocols, we'll implement specific commands in the future
          // For now, just log a message and send a generic command
          console.log(`📤 Protocolo ${scaleConfig.protocol} selecionado (implementação futura)`);
          await writer.write(encoder.encode('\x1BP'));
        }
        
        // Release the writer so we can read the response
        writer.releaseLock();
      }
    } catch (error) {
      console.error('❌ Erro ao enviar comando para solicitar peso estável:', error);
    }

    // Limpar timer anterior se existir
    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }

    // Aguardar peso estável pelo tempo configurado
    const timeout = scaleConfig.stableWeightTimeout;
    const startTime = Date.now();
    console.log(`⏱️ Timeout configurado: ${timeout}ms`);
    let lastWeight = 0;
    let stableCount = 0;
    const requiredStableReadings = 3; // Número de leituras estáveis consecutivas necessárias
    console.log(`📊 Leituras estáveis necessárias: ${requiredStableReadings}`);

    return new Promise((resolve) => {
      const checkStable = () => {
        // Se temos um peso atual e ele é estável
        if (currentWeight?.stable) {
          console.log(`⚖️ Leitura estável: ${(currentWeight.weight * 1000).toFixed(0)}g`);
          
          // Verificar se o peso está estável por várias leituras consecutivas
          if (Math.abs(lastWeight - currentWeight.weight) < 0.005) { // Tolerância de 5g
            stableCount++;
            console.log(`✅ Leitura estável ${stableCount}/${requiredStableReadings}`);
            
            if (stableCount >= requiredStableReadings) {
              console.log(`✅ Peso estável confirmado: ${(currentWeight.weight * 1000).toFixed(0)}g`);
              // Se o peso é muito baixo (próximo de zero), considere como erro
              if (currentWeight.weight < 0.01) { // menos de 10g
                console.warn('⚠️ Peso muito baixo, considerando como erro');
                setLastError('Peso muito baixo ou instável. Verifique se o produto está corretamente posicionado na balança.');
                resolve(null);
                return;
              // Se o peso é muito baixo (próximo de zero), considere como erro
              if (lastWeightRef.current.weight < 0.01) { // menos de 10g
                console.warn('⚠️ Último peso conhecido muito baixo, considerando como erro');
                setLastError('Último peso registrado muito baixo. Verifique se o produto está corretamente posicionado na balança.');
                resolve(null);
                return;
              }
                return;
              }
              resolve(currentWeight.weight);
              setLastError('Nenhum peso disponível após timeout. Verifique se a balança está conectada e funcionando corretamente.');
              return;
            }
          } else {
            // Reiniciar contagem se o peso mudou
            stableCount = 1;
          }
          
          lastWeight = currentWeight.weight;
        } else if (currentWeight) {
          console.log(`⚠️ Leitura instável: ${(currentWeight.weight * 1000).toFixed(0)}g`);
          stableCount = 0;
        } else {
          console.log('⚠️ Sem leitura de peso');
          stableCount = 0;
        }

        // Verificar timeout
        if (Date.now() - startTime > timeout) {
          console.warn(`⏱️ Timeout ao aguardar peso estável (${timeout}ms). Verifique se a balança está conectada e funcionando corretamente.`);
          
          // Se temos algum peso, mesmo que não estável, retornar o último valor
          if (currentWeight) {
            console.log(`⚠️ Retornando peso não estável: ${(currentWeight.weight * 1000).toFixed(0)}g`);
            setLastError('Timeout ao aguardar peso estável. Retornando último peso lido.');
            resolve(currentWeight.weight);
          } else if (lastWeightRef.current) {
            console.log(`⚠️ Retornando último peso conhecido: ${(lastWeightRef.current.weight * 1000).toFixed(0)}g`);
            resolve(lastWeightRef.current.weight);
          } else {
            console.warn('⚠️ Nenhum peso disponível após timeout. Verifique se a balança está conectada e funcionando corretamente.');
            resolve(null);
          }
          return;
        }
            setLastError('Timeout ao aguardar peso estável. Retornando último peso conhecido.');

        // Continuar verificando
        stableWeightTimerRef.current = window.setTimeout(checkStable, 100);
      };

      checkStable();
    });
  }, [connection.isConnected, currentWeight, scaleConfig.stableWeightTimeout]);

  // Simular peso para desenvolvimento (quando balança não está conectada)
  const simulateWeight = useCallback((weight: number) => {
    console.log(`🔄 Simulando peso: ${weight}g`);

    // Atualizar estado de conexão se não estiver conectado
    if (!connection.isConnected) {
      setConnection(prev => ({
        ...prev,
        protocol: 'Simulação',
        isConnected: true,
        model: 'Simulação',
        port: 'Simulado',
        error: null
      }));
    }
    
    const reading: WeightReading = {
      weight: weight / 1000, // Convert grams to kg
      stable: true,
      unit: 'kg',
      timestamp: new Date()
    };
    
    setCurrentWeight(reading);
    lastWeightRef.current = reading;
    return reading;
  }, [connection.isConnected]);

  // Load available ports on component mount
  useEffect(() => {
    listAvailablePorts();
  }, [listAvailablePorts]);

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      // Force full disconnection when component unmounts
      const forceCleanup = async () => {
        console.log('🧹 Limpeza completa ao desmontar componente');
        await cleanupSerialPort();
        setConnection({
          isConnected: false,
          error: null
        });
        setCurrentWeight(null);
        setLastError(null);
      };
      
      forceCleanup();
    };
  }, [cleanupSerialPort]);

  // Atualizar configuração da balança
  const updateConfig = useCallback((newConfig: Partial<typeof scaleConfig>) => {
    setScaleConfig(prev => ({
      ...prev,
      ...newConfig
    }));
  }, []);

  // Update refs with latest function instances to break circular dependency
  useEffect(() => {
    startReadingRef.current = startReading;
    reconnectRef.current = reconnect;
  }, [startReading, reconnect]);

  return {
    connection,
    currentWeight,
    isReading,
    availablePorts,
    lastError,
    reconnecting,
    scaleConfig,
    isWebSerialSupported,
    connect,
    disconnect,
    startReading,
    listAvailablePorts,
    requestStableWeight,
    simulateWeight,
    updateConfig
  };
};

// Função para parsear dados da balança Toledo Prix 3 Fit
const parseToledoWeight = (data: string): { value: number; stable: boolean; unit: string } | null => {
  // This function could be expanded to handle different protocols in the future
  try {
    const lines = data.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Ignorar linhas vazias
      if (!trimmed) continue;
      
      console.log('📊 Analisando linha da balança:', trimmed);
      
      // Buscar padrão de peso Toledo
      // Padrão flexível para capturar diferentes formatos de balanças Toledo
      let match = trimmed.match(/([ST|US]),([GS|NT]),([+-])(\d+\.?\d*)(kg|g|KG|G)/i) || 
                  trimmed.match(/([ST|US]),([GS|NT]),([+-])(\d+)(kg|g|KG|G)/i);
      
      // Se não encontrar no formato padrão, tenta formatos alternativos
      if (!match) {
        // Formato simples: apenas o peso com sinal e unidade
        match = trimmed.match(/([+-])?(\d+\.?\d*)(kg|g|KG|G)/i) || 
                trimmed.match(/([+-])?(\d+)(kg|g|KG|G)/i);
        if (match) {
          // Adaptar para o formato padrão
          const [_, sign = '+', value, unit] = match;
          // Assumir estável se não especificado
          return {
            value: parseFloat(value) * (sign === '-' ? -1 : 1),
            stable: true, // Assumir estável
            unit: unit.toLowerCase()
          };
        }
      }
      
      if (match) {
        // Extract weight information from the matched pattern
        const [, status, type, sign, value, unit] = match;
        
        const weight = parseFloat(value) * (sign === '-' ? -1 : 1);
        const stable = status.toUpperCase() === 'ST'; // ST = estável, US = instável
        
        console.log(`📊 Peso identificado: ${weight} ${unit} (${stable ? 'estável' : 'instável'})`);
        
        return {
          value: weight,
          stable,
          unit: unit.toLowerCase()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao parsear dados da balança:', error);
    return null;
  }
};