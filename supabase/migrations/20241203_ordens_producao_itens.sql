-- Migration: Criar tabela ordens_producao_itens
-- Permite rastrear múltiplos produtos/itens dentro de uma única OP
-- Cada item pode ter seu próprio status de produção

-- Criar tabela de itens da ordem de produção
CREATE TABLE IF NOT EXISTS ordens_producao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_producao_id UUID NOT NULL REFERENCES ordens_producao(id) ON DELETE CASCADE,
  pedido_item_id UUID REFERENCES pedidos_itens(id) ON DELETE SET NULL,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,

  -- Quantidades
  quantidade_metros NUMERIC(12,4) NOT NULL DEFAULT 0,
  quantidade_pecas INTEGER,
  comprimento_cada_mm NUMERIC(10,2),

  -- Status do item específico
  status VARCHAR(20) NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'em_producao', 'finalizado', 'cancelado')),

  -- Datas de produção do item
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,

  -- Observações específicas do item
  observacoes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_op_itens_ordem ON ordens_producao_itens(ordem_producao_id);
CREATE INDEX IF NOT EXISTS idx_op_itens_produto ON ordens_producao_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_op_itens_status ON ordens_producao_itens(status);
CREATE INDEX IF NOT EXISTS idx_op_itens_pedido_item ON ordens_producao_itens(pedido_item_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_op_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_op_itens_updated_at ON ordens_producao_itens;
CREATE TRIGGER trigger_update_op_itens_updated_at
  BEFORE UPDATE ON ordens_producao_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_op_itens_updated_at();

-- Desabilitar RLS para simplificar (seguindo padrão do projeto)
ALTER TABLE ordens_producao_itens DISABLE ROW LEVEL SECURITY;

-- Comentários
COMMENT ON TABLE ordens_producao_itens IS 'Itens individuais de uma ordem de produção - permite múltiplos produtos por OP';
COMMENT ON COLUMN ordens_producao_itens.status IS 'Status do item: aguardando, em_producao, finalizado, cancelado';
COMMENT ON COLUMN ordens_producao_itens.quantidade_metros IS 'Total de metros a produzir deste item';
