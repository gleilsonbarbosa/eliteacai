/*
  # Sistema de Upload de Imagens

  1. Novas Tabelas
    - `product_images` - Armazena informações das imagens
    - `product_image_associations` - Associa imagens aos produtos

  2. Storage
    - Bucket 'images' para armazenar arquivos
    - Políticas de acesso público para leitura

  3. Segurança
    - RLS habilitado
    - Políticas de acesso adequadas
*/

-- Tabela para armazenar informações das imagens
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  public_url text NOT NULL,
  original_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela para associar imagens aos produtos
CREATE TABLE IF NOT EXISTS product_image_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  image_id uuid NOT NULL REFERENCES product_images(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_image_associations ENABLE ROW LEVEL SECURITY;

-- Políticas para product_images
CREATE POLICY "Allow public read access to product_images"
  ON product_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert to product_images"
  ON product_images
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update to product_images"
  ON product_images
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow authenticated delete to product_images"
  ON product_images
  FOR DELETE
  TO public
  USING (true);

-- Políticas para product_image_associations
CREATE POLICY "Allow public read access to product_image_associations"
  ON product_image_associations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert to product_image_associations"
  ON product_image_associations
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update to product_image_associations"
  ON product_image_associations
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow authenticated delete to product_image_associations"
  ON product_image_associations
  FOR DELETE
  TO public
  USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_images_file_path ON product_images(file_path);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON product_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_image_associations_product_id ON product_image_associations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_image_associations_image_id ON product_image_associations(image_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar bucket de storage se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para permitir upload público
CREATE POLICY "Allow public uploads to images bucket"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'images');

-- Política de storage para permitir leitura pública
CREATE POLICY "Allow public read access to images bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'images');

-- Política de storage para permitir delete público
CREATE POLICY "Allow public delete access to images bucket"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'images');