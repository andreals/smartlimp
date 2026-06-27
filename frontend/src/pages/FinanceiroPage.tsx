import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import {
  formatBRL,
  formatClienteAutocompleteMeta,
  isValidBRDate,
} from '@/lib/format';
import type { Cliente, ComandaResumo, ComandaPecaDetalhe } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import DateField from '@/components/DateField';
import AutocompleteSelect from '@/components/AutocompleteSelect';

function toddmmyyyy(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function inicioSemanaAtual(): string {
  const hoje = new Date();
  const dow = hoje.getDay();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1));
  return toddmmyyyy(seg);
}

const INICIO_SEMANA = inicioSemanaAtual();
const HOJE = toddmmyyyy(new Date());

function tipoServicoExtenso(tipo: string): string {
  switch (tipo) {
    case 'LP': return 'Lavar e Passar';
    case 'L':  return 'Lavar';
    case 'P':  return 'Passar';
    case 'T':  return 'Tingir';
    default:   return tipo;
  }
}

export default function FinanceiroPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [idCliente, setIdCliente] = useState('');
  const [dataInicio, setDataInicio] = useState(INICIO_SEMANA);
  const [dataFim, setDataFim] = useState(HOJE);

  const [comandas, setComandas] = useState<ComandaResumo[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [pecasCache, setPecasCache] = useState<Record<number, ComandaPecaDetalhe[]>>({});
  const [loadingPecas, setLoadingPecas] = useState<Set<number>>(new Set());

  useEffect(() => {
    api
      .get<Cliente[]>('/clientes')
      .then(({ data }) => {
        setClientes(data);
        setLoadingComandas(true);
        api
          .get<ComandaResumo[]>('/financeiro/comandas', {
            params: { id_cliente: '', data_inicio: INICIO_SEMANA, data_fim: HOJE },
          })
          .then(({ data: d }) => setComandas(d))
          .catch((err) => toast.error(extractError(err, 'Erro ao consultar comandas')))
          .finally(() => setLoadingComandas(false));
      })
      .catch((err) => toast.error(extractError(err, 'Erro ao carregar clientes')));
  }, []);

  const filtrar = async () => {
    if (!dataInicio || !dataFim) {
      toast.error('Informe as datas');
      return;
    }
    if (!isValidBRDate(dataInicio) || !isValidBRDate(dataFim)) {
      toast.error('Informe datas válidas (dd/mm/aaaa)');
      return;
    }
    setLoadingComandas(true);
    setExpandedIds(new Set());
    setPecasCache({});
    try {
      const { data } = await api.get<ComandaResumo[]>('/financeiro/comandas', {
        params: { id_cliente: idCliente, data_inicio: dataInicio, data_fim: dataFim },
      });
      setComandas(data);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao consultar comandas'));
    } finally {
      setLoadingComandas(false);
    }
  };

  const excluirComanda = async (id: number) => {
    if (!confirm('Deseja realmente excluir essa comanda?')) return;
    try {
      await api.delete(`/comandas/${id}`);
      toast.success('Comanda excluída');
      filtrar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao excluir'));
    }
  };

  const toggleExpand = async (id: number) => {
    if (expandedIds.has(id)) {
      setExpandedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      return;
    }
    setExpandedIds((prev) => new Set(prev).add(id));
    if (pecasCache[id]) return;
    setLoadingPecas((prev) => new Set(prev).add(id));
    try {
      const { data } = await api.get<ComandaPecaDetalhe[]>(`/comandas/${id}/pecas`);
      setPecasCache((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      toast.error(extractError(err, 'Erro ao buscar peças'));
    } finally {
      setLoadingPecas((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const toggleConferido = async (comandaId: number, pecaId: number) => {
    try {
      const { data } = await api.patch<{ conferido: string }>(`/comandas/${comandaId}/pecas/${pecaId}/conferido`);
      setPecasCache((prev) => ({
        ...prev,
        [comandaId]: prev[comandaId].map((p) =>
          p.id === pecaId ? { ...p, conferido: data.conferido as 'S' | 'N' } : p,
        ),
      }));
    } catch (err) {
      toast.error(extractError(err, 'Erro ao atualizar'));
    }
  };

  const totalPecas = comandas.reduce((acc, c) => acc + Number(c.quantidade || 0), 0);
  const totalValor = comandas.reduce((acc, c) => acc + Number(c.valor || 0), 0);

  const clienteOptions = useMemo(
    () => [
      { value: '', label: 'Todos os clientes' },
      ...clientes.map((c) => ({
        value: String(c.id),
        label: c.nome,
        meta: formatClienteAutocompleteMeta(c),
      })),
    ],
    [clientes],
  );

  return (
    <>
      <PageHeader title="Conferência" subtitle="Conferência de comandas por período" />

      <section className="card mb-6">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="financeiro-cliente">Cliente</label>
            <AutocompleteSelect
              id="financeiro-cliente"
              options={clienteOptions}
              value={idCliente}
              onChange={setIdCliente}
              placeholder="Digite para buscar…"
            />
          </div>
          <DateField id="financeiro-data-inicio" label="Data inicial" value={dataInicio} onChange={setDataInicio} />
          <DateField id="financeiro-data-fim" label="Data final" value={dataFim} onChange={setDataFim} />
        </div>
        <div className="mt-3 flex justify-end">
          <button className="btn-primary" onClick={filtrar}>Filtrar</button>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="mb-3 text-base">Comandas do cliente</h2>
        {loadingComandas ? (
          <Spinner />
        ) : comandas.length === 0 ? (
          <EmptyState title="Sem dados" description="Selecione cliente e datas para filtrar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Cliente</th>
                  <th>#Comanda</th>
                  <th>Data</th>
                  <th>Qtd</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comandas.map((c) => (
                  <Fragment key={c.id}>
                    <tr>
                      <td className="pr-0">
                        <button
                          type="button"
                          onClick={() => toggleExpand(c.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          aria-label={expandedIds.has(c.id) ? 'Fechar detalhes' : 'Ver detalhes'}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`h-4 w-4 transition-transform duration-150 ${expandedIds.has(c.id) ? 'rotate-90' : ''}`}
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </td>
                      <td className="font-medium">{c.nome}</td>
                      <td>
                        <a
                          className="text-brand-600 hover:underline"
                          href={`/comandas/${c.id}/imprimir`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          #{c.numero}
                        </a>
                      </td>
                      <td>{c.data}</td>
                      <td>{c.quantidade}</td>
                      <td>{formatBRL(c.valor)}</td>
                      <td>
                        <div className="flex justify-end">
                          <button className="btn-danger text-xs" onClick={() => excluirComanda(c.id)}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedIds.has(c.id) && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="p-0">
                          {loadingPecas.has(c.id) ? (
                            <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500">
                              <Spinner />
                            </div>
                          ) : (pecasCache[c.id] ?? []).length === 0 ? (
                            <p className="px-4 py-2 text-xs text-slate-400">Nenhuma peça encontrada.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-left text-slate-500">
                                  <th className="w-8 py-1.5 pl-10 pr-2 font-medium">✓</th>
                                  <th className="py-1.5 pr-4 font-medium">Peça</th>
                                  <th className="py-1.5 pr-4 font-medium">Serviço</th>
                                  <th className="py-1.5 pr-4 font-medium">Valor unit.</th>
                                  <th className="py-1.5 pr-4 font-medium">Total</th>
                                  <th className="py-1.5 pr-4 font-medium">Pacote</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(pecasCache[c.id] ?? []).map((p) => (
                                  <tr
                                    key={p.id}
                                    className={`transition-colors ${p.conferido === 'S' ? 'bg-emerald-50' : ''}`}
                                  >
                                    <td className="py-1.5 pl-10 pr-2">
                                      <input
                                        type="checkbox"
                                        checked={p.conferido === 'S'}
                                        onChange={() => toggleConferido(c.id, p.id)}
                                        className="h-3.5 w-3.5 cursor-pointer rounded accent-emerald-600"
                                      />
                                    </td>
                                    <td className={`py-1.5 pr-4 ${p.conferido === 'S' ? 'text-slate-400 line-through' : ''}`}>
                                      <span className="mr-1.5 font-semibold text-slate-500">{p.quantidade}x</span>
                                      {p.descricao}
                                    </td>
                                    <td className="py-1.5 pr-4">{tipoServicoExtenso(p.tipo_servico)}</td>
                                    <td className="py-1.5 pr-4">
                                      {(p.entra_pacote === 'N' || p.tipo_cliente === 'avulso') ? formatBRL(p.valor_peca) : '—'}
                                    </td>
                                    <td className="py-1.5 pr-4 font-medium">
                                      {(p.entra_pacote === 'N' || p.tipo_cliente === 'avulso') ? formatBRL(p.valor_total) : '—'}
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      {p.entra_pacote === 'S' ? (
                                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700">Pacote</span>
                                      ) : (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">Avulso</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot className="font-semibold">
                <tr className="bg-slate-50">
                  <td colSpan={4} className="text-right">Totais:</td>
                  <td>{totalPecas}</td>
                  <td>{formatBRL(totalValor)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
