-- Adiciona a coluna equipe_id na tabela estoque e cria a foreign key para equipe
ALTER TABLE estoque ADD COLUMN equipe_id BIGINT;
ALTER TABLE estoque ADD CONSTRAINT fk_estoque_equipe FOREIGN KEY (equipe_id) REFERENCES equipe(id);

-- (Opcional) Se quiser garantir que todos os equipamentos estejam inicialmente sem equipe:
UPDATE estoque SET equipe_id = NULL;