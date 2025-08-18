/*
  # Adicionar coluna CNPJ à tabela store_settings
  
  1. Alterações
     - Adiciona a coluna `cnpj` à tabela `store_settings`
     
  2. Detalhes
     - A coluna é do tipo TEXT e pode ser nula
     - Valor padrão é NULL
*/

-- Adiciona a coluna cnpj à tabela store_settings
ALTER TABLE IF EXISTS public.store_settings 
ADD COLUMN IF NOT EXISTS cnpj TEXT DEFAULT NULL;

-- Comentário na coluna
COMMENT ON COLUMN public.store_settings.cnpj IS 'CNPJ da loja';