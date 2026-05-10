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
