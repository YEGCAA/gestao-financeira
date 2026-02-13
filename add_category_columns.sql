-- Script para adicionar colunas de categoria e subcategoria na tabela Fluxo de caixa
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna categoria_id
ALTER TABLE "Fluxo de caixa" 
ADD COLUMN IF NOT EXISTS categoria_id BIGINT;

-- Adicionar coluna subcategoria_id
ALTER TABLE "Fluxo de caixa" 
ADD COLUMN IF NOT EXISTS subcategoria_id BIGINT;

-- Adicionar Foreign Key para categoria_id (opcional, mas recomendado)
ALTER TABLE "Fluxo de caixa"
ADD CONSTRAINT fk_fluxo_categoria
FOREIGN KEY (categoria_id)
REFERENCES "Categoria"(id)
ON DELETE SET NULL;

-- Adicionar Foreign Key para subcategoria_id (opcional, mas recomendado)
ALTER TABLE "Fluxo de caixa"
ADD CONSTRAINT fk_fluxo_subcategoria
FOREIGN KEY (subcategoria_id)
REFERENCES "Subcategoria"(id)
ON DELETE SET NULL;

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_fluxo_categoria_id 
ON "Fluxo de caixa"(categoria_id);

CREATE INDEX IF NOT EXISTS idx_fluxo_subcategoria_id 
ON "Fluxo de caixa"(subcategoria_id);

-- Comentários para documentação
COMMENT ON COLUMN "Fluxo de caixa".categoria_id IS 'ID da categoria da transação (Foreign Key)';
COMMENT ON COLUMN "Fluxo de caixa".subcategoria_id IS 'ID da subcategoria da transação (Foreign Key)';
