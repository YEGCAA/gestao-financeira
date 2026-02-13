-- Script para adicionar colunas de notas e tags na tabela Fluxo de caixa
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna de notas (texto longo)
ALTER TABLE "Fluxo de caixa" 
ADD COLUMN IF NOT EXISTS notas TEXT;

-- Adicionar coluna de tags (array de texto)
ALTER TABLE "Fluxo de caixa" 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Comentários para documentação
COMMENT ON COLUMN "Fluxo de caixa".notas IS 'Notas/observações sobre o lançamento';
COMMENT ON COLUMN "Fluxo de caixa".tags IS 'Tags/etiquetas para categorização adicional do lançamento';

-- Criar índice GIN para busca eficiente em tags (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_fluxo_tags 
ON "Fluxo de caixa" USING GIN(tags);
