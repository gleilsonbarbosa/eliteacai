# Integração de Balança com Supabase

Este projeto demonstra como integrar uma balança Toledo com o Supabase para uso no PDV.

## Como funciona

1. O serviço de integração (`scale-integration-service.js`) se conecta à balança via porta serial
2. Lê os dados da balança e os envia para uma tabela no Supabase
3. O frontend consulta essa tabela para obter o peso atual

## Configuração

### 1. Crie uma tabela no Supabase

```sql
CREATE TABLE pesagem_temp (
  id SERIAL PRIMARY KEY,
  peso NUMERIC NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Adicione políticas de acesso
ALTER TABLE pesagem_temp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso público" ON pesagem_temp FOR ALL USING (true);
```

### 2. Configure o serviço de integração

Edite o arquivo `scale-integration-service.js` e atualize:

- `SUPABASE_URL` - URL do seu projeto Supabase
- `SUPABASE_KEY` - Chave anônima do seu projeto Supabase
- `SCALE_PORT` - Porta serial da balança (ex: COM1, /dev/ttyUSB0)
- `SCALE_BAUD_RATE` - Taxa de transmissão (geralmente 4800 para balanças Toledo)

### 3. Instale as dependências

```bash
npm install express cors axios serialport @serialport/parser-readline
```

### 4. Execute o serviço

```bash
node scale-integration-service.js
```

## Uso no Frontend

O frontend pode usar o hook `useWeightFromScale` para obter o peso da balança via Supabase.

## Solução de Problemas

- **Erro de CSP**: O frontend não consegue acessar diretamente o serviço local (localhost:4000) devido às restrições de CSP. Por isso usamos o Supabase como intermediário.
- **Balança não conectada**: Verifique se a porta serial está correta e se os drivers estão instalados.
- **Dados incorretos**: Verifique o formato dos dados da sua balança e ajuste o parser conforme necessário.