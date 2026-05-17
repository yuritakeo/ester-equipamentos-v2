-- Adiciona campos de indenização na tabela de equipamentos locados
ALTER TABLE equipamentosLocados
  ADD COLUMN IF NOT EXISTS indenizacao_valor NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS indenizacao_descricao TEXT;
