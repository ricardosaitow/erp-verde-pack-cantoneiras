-- ============================================
-- MIGRAÇÃO: Adicionar campos de frete aos itens do pedido
-- ============================================
-- Campos para armazenar a distribuição manual de frete CIF
-- calculada pelo usuário no formulário de pedido
-- ============================================

-- Adicionar campos de frete na tabela pedidos_itens
ALTER TABLE pedidos_itens
ADD COLUMN IF NOT EXISTS frete_unitario NUMERIC(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS frete_total_item NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_unitario_com_frete NUMERIC(10,4) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtotal_com_frete NUMERIC(10,2) DEFAULT NULL;

-- Comentários explicativos
COMMENT ON COLUMN pedidos_itens.frete_unitario IS 'Valor de frete por unidade/peça (distribuído manualmente pelo usuário em CIF)';
COMMENT ON COLUMN pedidos_itens.frete_total_item IS 'Valor total de frete do item (frete_unitario * quantidade)';
COMMENT ON COLUMN pedidos_itens.preco_unitario_com_frete IS 'Preço unitário + frete unitário (usado na NF-e CIF)';
COMMENT ON COLUMN pedidos_itens.subtotal_com_frete IS 'Subtotal com frete incluído (usado na NF-e CIF)';
