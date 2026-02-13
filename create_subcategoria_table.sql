-- Script para criar a tabela Subcategoria no Supabase
-- Execute este script no SQL Editor do Supabase

-- Criar a tabela Subcategoria
CREATE TABLE IF NOT EXISTS "Subcategoria" (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign Key para a tabela Categoria
  CONSTRAINT fk_categoria
    FOREIGN KEY (categoria_id)
    REFERENCES "Categoria"(id)
    ON DELETE CASCADE
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE "Subcategoria" ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações
-- IMPORTANTE: Ajuste as políticas de segurança conforme suas necessidades
CREATE POLICY "Enable all access for authenticated users" ON "Subcategoria"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Criar índice para melhorar performance nas buscas por categoria_id
CREATE INDEX IF NOT EXISTS idx_subcategoria_categoria_id 
ON "Subcategoria"(categoria_id);

-- Comentários para documentação
COMMENT ON TABLE "Subcategoria" IS 'Tabela de subcategorias vinculadas às categorias principais';
COMMENT ON COLUMN "Subcategoria".nome IS 'Nome da subcategoria';
COMMENT ON COLUMN "Subcategoria".categoria_id IS 'ID da categoria pai (Foreign Key)';
