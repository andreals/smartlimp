import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { formatBRL, maskBRLInput, parseBRL, todayBR, isValidBRDate } from '@/lib/format';
import type { Cliente, ItemComanda, Peca } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import DateField from '@/components/DateField';
import TipoServicoRadios, { type TipoServico } from '@/components/TipoServicoRadios';

const STORAGE_KEY = 'smartlimp:comanda';

const tipoLabel: Record<string, string> = {
  lavar: 'Lavar',
  passar: 'Passar',
  lavarpassar: 'Lavar e Passar',
  tingir: 'Tingir',
};

export default function ComandaPage() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);

  const [idCliente, setIdCliente] = useState('');
  const [dataComanda, setDataComanda] = useState(todayBR());
  const [idPeca, setIdPeca] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [tipo, setTipo] = useState<TipoServico | ''>('');
  const [desconto, setDesconto] = useState('0,00');
  const [acrescimo, setAcrescimo] = useState('0,00');
  const [pagamento, setPagamento] = useState(false);
  const [pontosDisponiveis, setPontosDisponiveis] = useState(0);
  const [saldoCliente, setSaldoCliente] = useState(0);
  const [tipoCliente, setTipoCliente] = useState('');
  const [pontosUtilizados, setPontosUtilizados] = useState(0);
  const [itens, setItens] = useState<ItemComanda[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ItemComanda[];
    } catch {
      return [];
    }
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
  }, [itens]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [c, p] = await Promise.all([
          api.get<Cliente[]>('/clientes?status=ativo'),
          api.get<Peca[]>('/pecas'),
        ]);
        setClientes(c.data);
        setPecas(p.data);
      } catch (err) {
        toast.error(extractError(err, 'Erro ao carregar dados'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setPontosUtilizados(0);
    setPontosDisponiveis(0);
    setSaldoCliente(0);
    setTipoCliente('');
    if (!idCliente) return;
    (async () => {
      try {
        const [pts, sld, tip] = await Promise.all([
          api.get<{ quantidade: number }>(`/clientes/${idCliente}/pontos`),
          api.get<{ valor: number }>(`/clientes/${idCliente}/saldo`),
          api.get<{ tipo: string }>(`/clientes/${idCliente}/tipo`),
        ]);
        setPontosDisponiveis(Number(pts.data.quantidade));
        setSaldoCliente(Number(sld.data.valor));
        setTipoCliente(tip.data.tipo);
      } catch (err) {
        toast.error(extractError(err, 'Erro ao consultar cliente'));
      }
    })();
  }, [idCliente]);

  const adicionarItem = () => {
    if (!idCliente) return toast.error('Selecione um cliente');
    if (!idPeca) return toast.error('Selecione uma peça');
    if (!quantidade || Number(quantidade) < 1) return toast.error('Quantidade inválida');
    if (!tipo) return toast.error('Selecione o tipo de serviço');

    const peca = pecas.find((p) => p.id === Number(idPeca));
    if (!peca) return;
    const valor =
      tipo === 'lavar' ? peca.valor_lavar
      : tipo === 'passar' ? peca.valor_passar
      : tipo === 'lavarpassar' ? peca.valor_lavarpassar
      : peca.valor_tingir;

    const novo: ItemComanda = {
      id: Math.random().toString(36).slice(2, 11),
      id_peca: peca.id,
      id_cliente: Number(idCliente),
      descricao: peca.nome,
      quantidade_peca: Number(quantidade),
      valor_peca: valor,
      tipo,
    };
    setItens((it) => [...it, novo]);
    setQuantidade('');
    setIdPeca('');
    setTipo('');
  };

  const removerItem = (id: string) => setItens((it) => it.filter((i) => i.id !== id));

  const totals = useMemo(() => {
    const subTotal = itens.reduce((acc, i) => acc + i.valor_peca * i.quantidade_peca, 0);
    const totalPecas = itens.reduce((acc, i) => acc + i.quantidade_peca, 0);
    const desc = parseBRL(desconto);
    const acr = parseBRL(acrescimo);
    let valorPontos = 0;
    if (pontosUtilizados === 250) valorPontos = 10;
    else if (pontosUtilizados === 350) valorPontos = 15;
    else if (pontosUtilizados === 440) valorPontos = 20;
    else if (pontosUtilizados === 540) valorPontos = 25;
    const subFinal = subTotal - desc + acr - valorPontos;
    const pontos = tipoCliente === 'fixo' ? Math.floor(subFinal / 3) : Math.floor(subFinal);
    const total = subFinal - saldoCliente;
    return { subTotal, totalPecas, valorPontos, pontosAcumulados: Math.max(0, pontos), total };
  }, [itens, desconto, acrescimo, pontosUtilizados, tipoCliente, saldoCliente]);

  const finalizar = async () => {
    if (!idCliente) return toast.error('Selecione um cliente');
    if (!isValidBRDate(dataComanda)) return toast.error('Data inválida');
    if (itens.length === 0) return toast.error('Adicione ao menos uma peça');

    setSubmitting(true);
    try {
      const { data } = await api.post<{ id: number; numero: number }>('/comandas', {
        id_cliente: Number(idCliente),
        data_comanda: dataComanda,
        pecas_comanda: itens.map((i) => ({
          id_peca: i.id_peca,
          id_cliente: i.id_cliente,
          descricao: i.descricao,
          quantidade_peca: i.quantidade_peca,
          valor_peca: i.valor_peca,
          tipo: i.tipo,
        })),
        desconto: parseBRL(desconto),
        acrescimo: parseBRL(acrescimo),
        pontos_acumulados: totals.pontosAcumulados,
        pontos_utilizados: pontosUtilizados,
        comanda_pagamento: pagamento ? 'S' : 'N',
      });
      toast.success(`Comanda #${data.numero} cadastrada!`);
      setItens([]);
      window.open(`/comandas/${data.id}/imprimir`, '_blank');
      setPagamento(false);
      setDesconto('0,00');
      setAcrescimo('0,00');
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar comanda'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <Spinner label="Carregando dados da comanda…" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Comanda" subtitle="Crie uma nova comanda para o cliente" />

      <section className="card mb-6">
        <h2 className="card-title">Dados da comanda</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label>Cliente*</label>
            <select className="input mt-1" value={idCliente} onChange={(e) => setIdCliente(e.target.value)}>
              <option value="">Selecione um cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.celular ? `(${c.celular})` : ''} {c.bairro ? `- ${c.bairro}` : ''}
                </option>
              ))}
            </select>
          </div>
          <DateField id="comanda-data" label="Data*" value={dataComanda} onChange={setDataComanda} required />
          <div>
            <label>Peça</label>
            <select className="input mt-1" value={idPeca} onChange={(e) => setIdPeca(e.target.value)}>
              <option value="">Selecione uma peça</option>
              {pecas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Quantidade</label>
            <input
              type="number"
              min={1}
              className="input mt-1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <TipoServicoRadios name="comanda-tipo-servico" value={tipo} onChange={setTipo} legend="Tipo*" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button type="button" className="btn-primary" onClick={adicionarItem}>
            Adicionar peça
          </button>
          {idCliente && (
            <span className="text-sm text-slate-600">
              {tipoCliente && <span className="capitalize">Cliente {tipoCliente} • </span>}
              Pontos: <strong className="font-semibold text-slate-800">{pontosDisponiveis}</strong> • Saldo:{' '}
              <strong className="font-semibold text-slate-800">{formatBRL(saldoCliente)}</strong>
            </span>
          )}
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="card-title">Itens</h2>
        {itens.length === 0 ? (
          <EmptyState
            title="Nenhuma peça na comanda"
            description="Selecione cliente, peça, quantidade e tipo de serviço, depois clique em Adicionar peça."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Qtd</th>
                  <th>Descrição</th>
                  <th>Serviço</th>
                  <th>Valor</th>
                  <th>Sub-Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td>{i.quantidade_peca}</td>
                    <td className="font-medium">{i.descricao}</td>
                    <td>{tipoLabel[i.tipo]}</td>
                    <td>{formatBRL(i.valor_peca)}</td>
                    <td>{formatBRL(i.valor_peca * i.quantidade_peca)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn-danger !rounded-lg !px-3 !py-1 !text-xs"
                        onClick={() => removerItem(i.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="card-title">Desconto e acréscimo</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-emerald-700">Desconto</label>
            <input
              className="input mt-1"
              value={desconto}
              onChange={(e) => setDesconto(maskBRLInput(e.target.value))}
            />
          </div>
          <div>
            <label className="text-rose-700">Acréscimo</label>
            <input
              className="input mt-1"
              value={acrescimo}
              onChange={(e) => setAcrescimo(maskBRLInput(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="card-title">Resumo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-tile">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pontos a acumular</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{totals.pontosAcumulados}</p>
          </div>
          <div className="stat-tile">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo cliente</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{formatBRL(saldoCliente)}</p>
          </div>
          <div className="stat-tile">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total de peças</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{totals.totalPecas}</p>
          </div>
          <div className="stat-tile border-brand-200/60 bg-gradient-to-br from-brand-50/80 to-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800/80">Valor total</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-700">{formatBRL(totals.total)}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
              checked={pagamento}
              onChange={(e) => setPagamento(e.target.checked)}
            />
            Comanda de pagamento?
          </label>
          <button type="button" className="btn-primary min-w-[10rem]" disabled={submitting} onClick={finalizar}>
            {submitting ? 'Finalizando...' : 'Finalizar Comanda'}
          </button>
        </div>
      </section>
    </>
  );
}
