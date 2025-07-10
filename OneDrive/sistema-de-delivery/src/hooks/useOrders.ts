import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus, ChatMessage } from '../types/order';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Buscando pedidos...');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      console.log(`✅ ${data?.length || 0} pedidos carregados`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Set channel to delivery if not specified
      // For manual orders, keep the channel as 'manual'
      const orderWithChannel = orderData.channel === 'manual' ? orderData : {
        ...orderData,
        channel: orderData.channel || 'delivery'
      };
      
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          ...orderWithChannel,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Criar notificação para novo pedido
      const notificationTitle = orderData.channel === 'manual' ? 'Pedido Manual Criado' : 'Novo Pedido';
      const notificationMessage = orderData.channel === 'manual' 
        ? `Pedido manual criado para ${orderData.customer_name}`
        : `Novo pedido de ${orderData.customer_name}`;
        
      await supabase
        .from('notifications')
        .insert([{
          order_id: data.id,
          type: 'new_order',
          title: notificationTitle,
          message: notificationMessage,
          read: false,
          created_at: new Date().toISOString()
        }]);

      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar pedido');
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Atualizar estado local
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, updated_at: new Date().toISOString() }
          : order
      ));

      // Criar notificação de atualização de status
      const statusMessages = {
        pending: 'Pedido recebido',
        confirmed: 'Pedido confirmado',
        preparing: 'Pedido em preparo',
        out_for_delivery: 'Pedido saiu para entrega',
        ready_for_pickup: 'Pedido pronto para retirada',
        delivered: 'Pedido entregue',
        cancelled: 'Pedido cancelado'
      };

      await supabase
        .from('notifications')
        .insert([{
          order_id: orderId,
          type: 'status_update',
          title: 'Status Atualizado',
          message: statusMessages[status],
          read: false,
          created_at: new Date().toISOString()
        }]);

    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  }, []);

  const playNotificationSound = () => {
    // Criar um som de notificação simples
    try {
      // Obter configuração de som do localStorage
      const soundSettings = localStorage.getItem('orderSoundSettings');
      const settings = soundSettings ? JSON.parse(soundSettings) : { enabled: true, volume: 0.7, soundUrl: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" };
      
      // Verificar se o som está habilitado
      if (!settings.enabled) {
        console.log('🔕 Som de notificação desabilitado nas configurações');
        return;
      }
      
      // Criar um elemento de áudio e tocar o som configurado
      const audio = new Audio(settings.soundUrl);
      audio.volume = settings.volume; // Ajustar volume conforme configuração
      audio.play().catch(e => {
        console.error('Erro ao tocar som de notificação:', e);
        // Tentar método alternativo se falhar
        playFallbackSound();
      });
      
      // Mostrar notificação visual também, se suportado pelo navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Novo Pedido!', {
          body: 'Um novo pedido de delivery foi recebido.',
          icon: '/vite.svg'
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        // Solicitar permissão
        Notification.requestPermission();
      }
    } catch (error) {
      console.error('Erro ao tocar som de notificação:', error);
      // Tentar método alternativo se falhar
      playFallbackSound();
    }
  };
  
  // Função de fallback para tocar som usando Web Audio API
  const playFallbackSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Criar um som de campainha/sino
      const playBellSound = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Frequência mais alta para chamar atenção
        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';
        
        // Volume inicial mais alto
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
      
      // Tocar o som duas vezes com intervalo para chamar mais atenção
      playBellSound();
      
      // Tocar novamente após 300ms
      setTimeout(() => {
        playBellSound();
      }, 300);
    } catch (error) {
      console.error('Erro ao tocar som de fallback:', error);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Configurar realtime para pedidos
    const ordersChannel = supabase
      .channel('orders')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('🔔 Novo pedido recebido via realtime:', payload);
          setOrders(prev => [payload.new as Order, ...prev]);
          // Tocar som de notificação
          playNotificationSound();
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('🔄 Pedido atualizado via realtime:', payload);
          setOrders(prev => prev.map(order => 
            order.id === payload.new.id ? payload.new as Order : order
          ));
        }
      )
      .subscribe((status) => console.log('🔌 Status da inscrição de pedidos:', status));

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    refetch: fetchOrders
  };
};

export const useOrderChat = (orderId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Buscando mensagens para o pedido:', orderId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      console.log('✅ Mensagens carregadas:', data?.length || 0);
      setLastFetch(new Date());
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, [orderId]);

  // Função para recarregar mensagens periodicamente
  const refreshMessages = useCallback(async () => {
    try {
      console.log('🔄 Recarregando mensagens para o pedido:', orderId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Só atualizar se houver mudanças
      console.log('✅ Mensagens recarregadas:', data?.length || 0);
      const newMessages = data || [];
      if (newMessages.length !== messages.length || 
          (newMessages.length > 0 && messages.length > 0 && 
           newMessages[newMessages.length - 1].id !== messages[messages.length - 1]?.id)) {
        setMessages(newMessages);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error('Erro ao recarregar mensagens:', err);
    }
  }, [orderId, messages]);

  const sendMessage = useCallback(async (
    message: string, 
    senderType: 'customer' | 'attendant',
    senderName: string,
    options?: { playSound?: boolean }
  ) => {
    try {
      console.log('📤 Enviando mensagem:', message, 'tipo:', senderType);
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          order_id: orderId,
          sender_type: senderType,
          sender_name: senderName,
          message,
          created_at: new Date().toISOString(),
          read_by_customer: senderType === 'customer',
          read_by_attendant: senderType === 'attendant'
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Mensagem enviada com sucesso');

      // Criar notificação para nova mensagem
      await supabase
        .from('notifications')
        .insert([{
          order_id: orderId,
          type: 'new_message',
          title: 'Nova Mensagem',
          message: `Nova mensagem de ${senderName}`,
          read: false,
          created_at: new Date().toISOString()
        }]);

      // Tocar som se solicitado
      if (options?.playSound) {
        playMessageSound();
      }

      return data;
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    }
  }, [orderId]);

  const markAsRead = useCallback(async (messageId: string, readerType: 'customer' | 'attendant') => {
    try {
      const updateField = readerType === 'customer' ? 'read_by_customer' : 'read_by_attendant';
      
      const { error } = await supabase
        .from('chat_messages')
        .update({ [updateField]: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;

    fetchMessages();

    // Configurar polling para garantir que as mensagens sejam atualizadas
    const pollingInterval = setInterval(() => {
      refreshMessages();
    }, 3000); // Verificar a cada 3 segundos

    // Configurar realtime para mensagens
    const messagesChannel = supabase
      .channel(`chat:${orderId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('🔔 Nova mensagem recebida via realtime:', payload);
          console.log('📨 Nova mensagem recebida via realtime:', payload.new);
          setMessages(prev => [...prev, payload.new as ChatMessage]);
          setLastFetch(new Date());
          // Tocar som para nova mensagem
          if (payload.new.sender_type !== (isAttendant ? 'attendant' : 'customer')) {
            playMessageSound();
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('🔄 Mensagem atualizada via realtime:', payload);
          console.log('📝 Mensagem atualizada via realtime:', payload.new);
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new as ChatMessage : msg
          ));
          setLastFetch(new Date());
        }
      )
      .subscribe((status) => console.log('🔌 Status da inscrição do chat:', status));

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(messagesChannel);
    };
  }, [orderId, fetchMessages, refreshMessages]);

  const playMessageSound = () => {
    try {
      // Obter configuração de som do localStorage
      const soundSettings = localStorage.getItem('chatSoundSettings');
      const settings = soundSettings ? JSON.parse(soundSettings) : { enabled: true, volume: 0.5, soundUrl: "https://assets.mixkit.co/active_storage/sfx/1862/1862-preview.mp3" };
      
      // Verificar se o som está habilitado
      if (!settings.enabled) {
        console.log('🔕 Som de mensagem desabilitado nas configurações');
        return;
      }
      
      // Criar um elemento de áudio e tocar o som configurado
      const audio = new Audio(settings.soundUrl);
      audio.volume = settings.volume; // Ajustar volume conforme configuração
      audio.play().catch(e => {
        console.error('Erro ao tocar som de mensagem:', e);
        // Tentar método alternativo se falhar
        playMessageSoundFallback();
      });
    } catch (error) {
      console.error('Erro ao tocar som de mensagem:', error);
      // Tentar método alternativo se falhar
      playMessageSoundFallback();
    }
  };
  
  // Função de fallback para tocar som usando Web Audio API
  const playMessageSoundFallback = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Erro ao tocar som de fallback:', error);
    }
  };

  // Recarregar mensagens quando a página ganha foco
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Página ganhou foco, recarregando mensagens...');
      refreshMessages();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Página ficou visível, recarregando mensagens...');
        refreshMessages();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshMessages]);

  return {
    messages,
    loading,
    lastFetch,
    sendMessage,
    markAsRead,
    refetch: fetchMessages,
    refreshMessages
  };
};