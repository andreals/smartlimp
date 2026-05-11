import { useState } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { formatBRL, isValidBRDate, todayBR } from '@/lib/format';
import type { DashboardGranularidade, DashboardResponse } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import DateField from '@/components/DateField';
import ClienteTipoBadge from '@/components/ClienteTipoBadge';
import {
  DashboardMixPieChart,
  DashboardPacotesChart,
  DashboardRankingChart,
  DashboardReceitaTipoChart,
  DashboardVolumeChart,
} from '@/components/dashboard/GestaoCharts';

const tipoServicoLabel: Record<string, string> = {
  lavar: 'Lavar',
  passar: 'Passar',
  lavarpassar: 'Lavar e passar',
  tingir: 'Tingir',
};

const tipoClienteLabel: Record<string, string> = {
  fixo: 'Fixo',
  avulso: 'Avulso',
};

const perfilRiscoLabel: Record<string, string> = {
  longa: 'Há mais tempo',
  recente: 'Perto do limite',
};

function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`.replace('.', ',');
}

function startOfMonthBR(): string {
  const t = new Date();
  return `01/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
}

export default function DashboardPage() {
  const [dataInicio, setDataInicio] = useState(startOfMonthBR);
  const [dataFim, setDataFim] = useState(todayBR);
  const [granularidade, setGranularidade] = useState<DashboardGranularidade>('dia');
  const [diasSemComanda, setDiasSemComanda] = useState('45');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardResponse | null>(null);

  const carregar = async () => {
    if (!isValidBRDate(dataInicio) || !isValidBRDate(dataFim)) {
      toast.error('Informe datas válidas (dd/mm/aaaa)');
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get<DashboardResponse>('/financeiro/dashboard', {
        params: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          granularidade,
          dias_sem_comanda: diasSemComanda || '45',
        },
      });
      setData(res);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar dashboard'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Gestão"
        subtitle="Volume, mix e ranking nas comandas do período. Faturamento, ticket e receita por tipo: cliente fixo com pacote usa pró-rata do valor do pacote como mensalidade (30 dias) pelos dias do filtro + extras (fora do pacote, acréscimos e saldo)."
      />

      <section className="card mb-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <DateField id="dash-ini" label="Data inicial" value={dataInicio} onChange={setDataInicio} />
          <DateField id="dash-fim" label="Data final" value={dataFim} onChange={setDataFim} />
          <div>
            <label htmlFor="dash-gran">Agrupar volume</label>
            <select
              id="dash-gran"
              className="input mt-1 w-full"
              value={granularidade}
              onChange={(e) => setGranularidade(e.target.value as DashboardGranularidade)}
            >
              <option value="dia">Por dia</option>
              <option value="semana">Por semana</option>
              <option value="mes">Por mês</option>
            </select>
          </div>
          <div>
            <label htmlFor="dash-risco">Risco: sem comanda há (dias)</label>
            <input
              id="dash-risco"
              type="number"
              min={1}
              className="input mt-1 w-full"
              value={diasSemComanda}
              onChange={(e) => setDiasSemComanda(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" className="btn-primary" onClick={carregar}>
            Atualizar
          </button>
        </div>
      </section>

      {loading ? (
        <Spinner />
      ) : !data ? (
        <EmptyState
          title="Nenhum relatório carregado"
          description="Defina o período e clique em Atualizar para ver os indicadores."
        />
      ) : (
        <>
          <section
            className={`relative z-[100] mb-6 grid gap-4 sm:grid-cols-2 ${data.mostrar_faturamento_previsto ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}
          >
            <div className="card relative !overflow-hidden !p-4 pt-5 shadow-card">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-amber-400 to-brand-600" />
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Faturamento</div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatBRL(data.faturamento_total)}</div>
              <div className="mt-1 text-xs text-slate-500">
                {data.data_inicio} — {data.data_fim}
              </div>
            </div>
            {data.mostrar_faturamento_previsto ? (
              <div className="card relative z-50 !overflow-visible !p-4 pt-5 shadow-card">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-500" />
                <div className="relative z-[300] flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Faturamento previsto</div>
                  <span className="group/tooltip relative shrink-0">
                    <button
                      type="button"
                      aria-describedby="faturamento-previsto-ajuda"
                      className="relative z-[310] flex h-6 w-6 cursor-help items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-white hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      aria-label="Como o faturamento previsto é calculado"
                    >
                      ?
                    </button>
                    <div
                      id="faturamento-previsto-ajuda"
                      role="tooltip"
                      className="pointer-events-none invisible absolute right-0 top-full z-[320] mt-1 w-[min(17rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-left text-xs font-normal normal-case leading-relaxed text-slate-600 opacity-0 shadow-xl ring-1 ring-black/10 transition-opacity duration-150 group-hover/tooltip:pointer-events-auto group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:pointer-events-auto group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100"
                    >
                      Mesmo mês civil, filtro com {data.previsto_dias_filtro} de {data.previsto_dias_mes} dias: avulso
                      = total no período; fixo = mensalidade do mês cheio (preço × {data.previsto_dias_mes} ÷ 30) para
                      fixo com pacote com comanda no período + extras e fixo sem pacote só nesse intervalo.
                    </div>
                  </span>
                </div>
                <div className="relative z-0 mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {formatBRL(data.faturamento_previsto)}
                </div>
                <div className="relative z-0 mt-1 text-xs font-medium text-slate-600">
                  Avulso: {formatBRL(data.faturamento_previsto_avulso)} · Fixo:{' '}
                  {formatBRL(data.faturamento_previsto_fixo)}
                </div>
              </div>
            ) : null}
            <div className="card relative !overflow-hidden !p-4 pt-5 shadow-card">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600" />
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket médio</div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatBRL(data.ticket_medio)}</div>
              <div className="mt-1 text-xs text-slate-500">{data.quantidade_comandas} comandas</div>
            </div>
            <div className="card relative !overflow-hidden !p-4 pt-5 shadow-card">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 to-violet-600" />
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Peças (período)</div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{data.quantidade_pecas}</div>
              <div className="mt-1 text-xs text-slate-500">Itens em comanda_pecas</div>
            </div>
            <div className="card relative !overflow-hidden !p-4 pt-5 shadow-card">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-600" />
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clientes ativos</div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{data.clientes_ativos}</div>
              <div className="mt-1 text-xs text-slate-500">Com pelo menos uma comanda no período</div>
            </div>
          </section>

          <section className="card mb-6 overflow-hidden border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/60 shadow-card">
            <div className="border-b border-slate-100/90 bg-slate-50/50 px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-slate-900">Volume (peças e comandas)</h2>
              <p className="mt-0.5 text-xs text-slate-500">Barras por período · passe o cursor para ver comandas</p>
            </div>
            <div className="p-3 sm:p-5">
              {data.volume.length === 0 ? (
                <p className="text-sm text-slate-500">Sem movimento no período.</p>
              ) : (
                <DashboardVolumeChart volume={data.volume} granularidade={data.granularidade} />
              )}
            </div>
          </section>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <section className="card overflow-hidden border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 shadow-card">
              <div className="border-b border-slate-100/90 bg-slate-50/50 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-slate-900">Mix de serviço</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Proporção pelo valor nas linhas da comanda · detalhe numérico na tabela
                </p>
              </div>
              <div className="p-3 sm:p-5">
                {data.mix_servico.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem dados.</p>
                ) : (
                  <>
                    <DashboardMixPieChart mix={data.mix_servico} tipoLabel={tipoServicoLabel} />
                    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100 bg-white/80">
                      <table className="table-base text-sm">
                        <thead>
                          <tr className="bg-slate-50/90">
                            <th className="!py-2">Serviço</th>
                            <th className="!py-2 text-right">Peças</th>
                            <th className="!py-2 text-right">Valor linhas</th>
                            <th className="!py-2 text-right">% peças</th>
                            <th className="!py-2 text-right">% valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.mix_servico.map((m) => (
                            <tr key={m.tipo}>
                              <td className="font-medium">{tipoServicoLabel[m.tipo] ?? m.tipo}</td>
                              <td className="text-right">{m.pecas}</td>
                              <td className="text-right">{formatBRL(m.valor)}</td>
                              <td className="text-right">{formatPercent(m.pct_pecas)}</td>
                              <td className="text-right">{formatPercent(m.pct_valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="card overflow-hidden border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 shadow-card">
              <div className="border-b border-slate-100/90 bg-slate-50/50 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-slate-900">Receita por tipo de cliente</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Pró-rata do pacote com base mensal de 30 dias (preço do pacote) + avulso conforme comandas · valores alinhados aos cards acima
                </p>
              </div>
              <div className="p-3 sm:p-5">
                {data.receita_por_tipo_cliente.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem dados.</p>
                ) : (
                  <>
                    <DashboardReceitaTipoChart rows={data.receita_por_tipo_cliente} tipoLabel={tipoClienteLabel} />
                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 bg-white/80">
                      <table className="table-base text-sm">
                        <thead>
                          <tr className="bg-slate-50/90">
                            <th className="!py-2">Tipo</th>
                            <th className="!py-2 text-right">Comandas</th>
                            <th className="!py-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.receita_por_tipo_cliente.map((r) => (
                            <tr key={r.tipo}>
                              <td className="font-medium">{tipoClienteLabel[r.tipo] ?? r.tipo}</td>
                              <td className="text-right">{r.comandas}</td>
                              <td className="text-right">{formatBRL(r.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <section className="card mb-6 overflow-hidden border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 shadow-card">
            <div className="border-b border-slate-100/90 bg-slate-50/50 px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-slate-900">Ranking de peças (top 10)</h2>
              <p className="mt-0.5 text-xs text-slate-500">Quantidade processada no período</p>
            </div>
            <div className="p-3 sm:p-5">
              {data.ranking_pecas.length === 0 ? (
                <p className="text-sm text-slate-500">Sem dados.</p>
              ) : (
                <>
                  <DashboardRankingChart ranking={data.ranking_pecas} />
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 bg-white/80">
                    <table className="table-base text-sm">
                      <thead>
                        <tr className="bg-slate-50/90">
                          <th className="!py-2">#</th>
                          <th className="!py-2">Peça</th>
                          <th className="!py-2 text-right">Qtd</th>
                          <th className="!py-2 text-right">Valor linhas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.ranking_pecas.map((p, i) => (
                          <tr key={p.id}>
                            <td className="text-slate-500">{i + 1}</td>
                            <td className="font-medium">{p.nome}</td>
                            <td className="text-right">{p.quantidade}</td>
                            <td className="text-right">{formatBRL(p.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <section className="card overflow-hidden border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 shadow-card">
              <div className="border-b border-slate-100/90 bg-slate-50/50 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-slate-900">Clientes por pacote</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Clientes com pelo menos uma comanda no período (por pacote associado ao cadastro)
                </p>
              </div>
              <div className="p-3 sm:p-5">
                {data.clientes_por_pacote.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem dados.</p>
                ) : (
                  <>
                    <DashboardPacotesChart rows={data.clientes_por_pacote} />
                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 bg-white/80">
                      <table className="table-base text-sm">
                        <thead>
                          <tr className="bg-slate-50/90">
                            <th className="!py-2">Pacote</th>
                            <th className="!py-2 text-right">Clientes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.clientes_por_pacote.map((row) => (
                            <tr key={`${row.id_pacote}-${row.nome_pacote}`}>
                              <td className="font-medium">{row.nome_pacote}</td>
                              <td className="text-right">{row.clientes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="card">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Clientes em risco</h2>
              <p className="mb-3 text-xs text-slate-500">
                Clientes com status ativo no cadastro cuja última comanda é há mais de {data.dias_sem_comanda} dias: até 10 mais próximos do limite
                (lista primeiro), depois até 10 com maior ausência (máx. 20 no total).
              </p>
              {data.clientes_risco.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum cliente nessa condição.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Perfil</th>
                        <th>Última comanda</th>
                        <th className="text-right">Dias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.clientes_risco.map((c) => (
                        <tr key={c.id}>
                          <td className="font-medium">{c.nome}</td>
                          <td className="align-middle">
                            <ClienteTipoBadge tipo={c.tipo_cliente ?? ''} />
                          </td>
                          <td>
                            <span
                              className={
                                c.perfil === 'longa'
                                  ? 'inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-200/80'
                                  : c.perfil === 'recente'
                                    ? 'inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80'
                                    : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80'
                              }
                            >
                              {perfilRiscoLabel[c.perfil ?? ''] ?? c.perfil ?? '—'}
                            </span>
                          </td>
                          <td>{c.ultima_comanda}</td>
                          <td className="text-right">{c.dias_sem_comanda}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
