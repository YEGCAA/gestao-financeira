-- Script para adicionar a coluna 'tipo' à tabela "Fluxo de caixa"
-- Esta coluna armazena o tipo da transação: INCOME (entrada) ou EXPENSE (saída)

-- Adicionar coluna tipo se não existir
ALTER TABLE "Fluxo de caixa" 
ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('INCOME', 'EXPENSE'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN "Fluxo de caixa".tipo IS 'Tipo da transação: INCOME (entrada) ou EXPENSE (saída)';

-- Atualizar registros existentes baseado no valor
-- Se Valor >= 0, é INCOME, senão é EXPENSE
UPDATE "Fluxo de caixa"
SET tipo = CASE 
  WHEN "Valor" >= 0 THEN 'INCOME'
  ELSE 'EXPENSE'
END
WHERE tipo IS NULL;

-- Tornar a coluna obrigatória após preencher os dados existentes
ALTER TABLE "Fluxo de caixa" 
ALTER COLUMN tipo SET NOT NULL;
