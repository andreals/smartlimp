export interface Usuario {
  id: number;
  nome: string;
  login: string;
  senha?: string;
  status: 'ativo' | 'inativo';
}

export interface Pacote {
  id: number;
  nome: string;
  tipo: string;
  preco: number;
  quantidade: number;
}

export interface Peca {
  id: number;
  nome: string;
  valor_lavar: number;
  valor_passar: number;
  valor_lavarpassar: number;
  valor_tingir: number;
  entra_pacote: 'S' | 'N';
}

export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  celular: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  email: string;
  tipo: 'avulso' | 'fixo';
  frequencia_pagamento: 'diario' | 'semanal' | 'dezenal' | 'quinzenal' | 'mensal' | '';
  dia_vencimento: string;
  antecipado: 'S' | 'N';
  status: 'ativo' | 'inativo';
  id_pacote: number | null;
  pacote: string;
  tipo_pacote: string;
  preco_pacote: number;
  quantidade_pacote: number;
}

export interface ItemComanda {
  id: string;
  id_peca: number;
  id_cliente: number;
  descricao: string;
  quantidade_peca: number;
  valor_peca: number;
  tipo: 'lavar' | 'passar' | 'lavarpassar' | 'tingir';
}

export interface ComandaResumo {
  id: number;
  id_cliente: number;
  numero: number;
  data: string;
  nome: string;
  valor: number;
  quantidade: number;
  efetuou_pagamento: 'S' | 'N';
}

export interface ImpressaoPeca {
  quantidade: number;
  descricao: string;
  tipo: string;
  tipo_servico: string;
  valor_peca: number;
  valor_total: number;
  entra_pacote: string;
}

export interface Impressao {
  numero: number;
  cliente: string;
  pacote: string;
  tipo_pacote: string;
  tipo_cliente: string;
  data_comanda: string;
  pagamento: string;
  logradouro: string;
  numero_casa: string;
  bairro: string;
  cidade: string;
  telefone: string;
  celular: string;
  frequencia_pagamento: string;
  dia_vencimento: string;
  pecas: ImpressaoPeca[];
  sub_total: number;
  desconto: number;
  acrescimo: number;
  saldo: number;
  total_pecas: number;
  total_valor: number;
  total_vencimento: number;
  pontos: number;
  pontos_acumulados: number;
  pontos_utilizados: number;
  valor_pontos: number;
}

export type DashboardGranularidade = 'dia' | 'semana' | 'mes';

export interface DashboardVolume {
  periodo: string;
  pecas: number;
  comandas: number;
}

export interface DashboardMix {
  tipo: string;
  pecas: number;
  valor: number;
  pct_pecas: number;
  pct_valor: number;
}

export interface DashboardRankingPeca {
  id: number;
  nome: string;
  quantidade: number;
  valor: number;
}

export interface DashboardReceitaTipo {
  tipo: string;
  valor: number;
  comandas: number;
}

export interface DashboardClientePacote {
  id_pacote: number;
  nome_pacote: string;
  clientes: number;
}

export interface DashboardClienteRisco {
  id: number;
  nome: string;
  ultima_comanda: string;
  dias_sem_comanda: number;
  /** longa = há mais tempo sem pedido; recente = ultrapassou o limite há pouco */
  perfil?: 'longa' | 'recente';
  /** fixo | avulso */
  tipo_cliente?: string;
}

export interface DashboardResponse {
  data_inicio: string;
  data_fim: string;
  granularidade: DashboardGranularidade;
  dias_sem_comanda: number;
  faturamento_total: number;
  /** Só true quando o filtro é menor que o mês civil e início/fim no mesmo mês */
  mostrar_faturamento_previsto: boolean;
  faturamento_previsto: number;
  faturamento_previsto_avulso: number;
  faturamento_previsto_fixo: number;
  previsto_dias_filtro: number;
  previsto_dias_mes: number;
  quantidade_comandas: number;
  quantidade_pecas: number;
  ticket_medio: number;
  clientes_ativos: number;
  volume: DashboardVolume[];
  mix_servico: DashboardMix[];
  ranking_pecas: DashboardRankingPeca[];
  receita_por_tipo_cliente: DashboardReceitaTipo[];
  clientes_por_pacote: DashboardClientePacote[];
  clientes_risco: DashboardClienteRisco[];
}
