-- =====================================================
-- Migration: Adicionar constraint única em pedido_id
-- Data: 2024-12-03
-- Descrição: Impede criação de múltiplas OPs para o mesmo pedido
-- =====================================================

-- Primeiro, verificar se há duplicatas existentes
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT pedido_id, COUNT(*) as cnt
    FROM ordens_producao
    WHERE pedido_id IS NOT NULL
    GROUP BY pedido_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF dup_count > 0 THEN
    RAISE NOTICE 'ATENÇÃO: Existem % pedidos com múltiplas OPs. Limpeza necessária antes de aplicar constraint.', dup_count;
  END IF;
END $$;

-- Criar índice único parcial (permite NULL, mas valores não-NULL devem ser únicos)
-- Isso permite que pedidos sem pedido_id existam (OPs manuais), mas cada pedido só pode ter UMA OP
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordens_producao_pedido_id_unique
ON ordens_producao (pedido_id)
WHERE pedido_id IS NOT NULL;

-- Comentário explicativo
COMMENT ON INDEX idx_ordens_producao_pedido_id_unique IS
'Garante que cada pedido tenha no máximo uma ordem de produção. OPs sem pedido_id (manuais) são permitidas.';
