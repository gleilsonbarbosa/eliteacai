import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DeliveryNeighborhood } from '../types/delivery';

export const useNeighborhoods = () => {
  const [neighborhoods, setNeighborhoods] = useState<DeliveryNeighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNeighborhoods = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_neighborhoods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setNeighborhoods(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar bairros');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllNeighborhoods = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_neighborhoods')
        .select('*')
        .order('name');

      if (error) throw error;
      setNeighborhoods(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar bairros');
    } finally {
      setLoading(false);
    }
  }, []);

  const createNeighborhood = useCallback(async (neighborhood: Omit<DeliveryNeighborhood, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('delivery_neighborhoods')
        .insert([{
          ...neighborhood,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      setNeighborhoods(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar bairro');
    }
  }, []);

  const updateNeighborhood = useCallback(async (id: string, updates: Partial<DeliveryNeighborhood>) => {
    try {
      const { data, error } = await supabase
        .from('delivery_neighborhoods')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setNeighborhoods(prev => 
        prev.map(n => n.id === id ? data : n).sort((a, b) => a.name.localeCompare(b.name))
      );
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar bairro');
    }
  }, []);

  const deleteNeighborhood = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_neighborhoods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNeighborhoods(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir bairro');
    }
  }, []);

  const getNeighborhoodById = useCallback((id: string) => {
    return neighborhoods.find(n => n.id === id);
  }, [neighborhoods]);

  const getNeighborhoodByName = useCallback((name: string) => {
    return neighborhoods.find(n => n.name.toLowerCase() === name.toLowerCase());
  }, [neighborhoods]);

  useEffect(() => {
    fetchNeighborhoods();
  }, [fetchNeighborhoods]);

  return {
    neighborhoods,
    loading,
    error,
    createNeighborhood,
    updateNeighborhood,
    deleteNeighborhood,
    getNeighborhoodById,
    getNeighborhoodByName,
    fetchNeighborhoods,
    fetchAllNeighborhoods
  };
};