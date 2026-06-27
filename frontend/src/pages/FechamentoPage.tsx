import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { formatBRL, formatClienteAutocompleteMeta } from '@/lib/format';
import type { FechamentoOut } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import AutocompleteSelect from '@/components/AutocompleteSelect';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ANOS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

type TipoFiltro = '' | 'fixo' | 'avulso';

interface ClienteFechamento {
  id: number;
  nome: string;
  celular: string;
  telefone: string;
  bairro: string;
}

export default function FechamentoPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(String(hoje.getMonth() + 1));
  const [ano, setAno] = useState(String(hoje.getFullYear()));
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('');
  const [clientes, setClientes] = useState<ClienteFechamento[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [idCliente, setIdCliente] = useState('');
  const [resultado, setResultado] = useState<FechamentoOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFechar, setLoadingFechar] = useState(false);

  useEffect(() => {
    setIdCliente('');
    setResultado(null);
    setLoadingClientes(true);
    api
      .get<ClienteFechamento[]>('/financeiro/clientes-fechamento', {
        params: { mes, ano, tipo_cliente: tipoFiltro },
      })
      .then(({ data }) => setClientes(data))
      .catch((err) => toast.error(extractError(err, 'Erro ao carregar clientes')))
      .finally(() => setLoadingClientes(false));
  }, [mes, ano, tipoFiltro]);

  const filtrar = async () => {
    if (!idCliente) {
      toast.error('Selecione um cliente');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<FechamentoOut>('/financeiro/fechamento', {
        params: { id_cliente: idCliente, mes, ano },
      });
      setResultado(data);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao buscar fechamento'));
    } finally {
      setLoading(false);
    }
  };

  const realizarFechamento = async () => {
    if (!idCliente || !resultado) return;
    if (!confirm(`Confirma o fechamento de todas as comandas pendentes de ${resultado.cliente} em ${mesNome} de ${ano}?`)) return;
    setLoadingFechar(true);
    try {
      await api.post('/financeiro/fechamento', {
        id_cliente: Number(idCliente),
        mes: Number(mes),
        ano: Number(ano),
      });
      toast.success('Fechamento realizado com sucesso');
      const { data } = await api.get<FechamentoOut>('/financeiro/fechamento', {
        params: { id_cliente: idCliente, mes, ano },
      });
      setResultado(data);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao realizar fechamento'));
    } finally {
      setLoadingFechar(false);
    }
  };

  const clienteOptions = useMemo(
    () => [
      {
        value: '',
        label: clientes.length === 0 ? 'Nenhum cliente com comandas neste mês' : 'Selecione um cliente',
      },
      ...clientes.map((c) => ({
        value: String(c.id),
        label: c.nome,
        meta: formatClienteAutocompleteMeta(c),
      })),
    ],
    [clientes],
  );

  const isFixo = resultado?.tipo_cliente === 'fixo' && !!resultado?.pacote;
  const mesNome = MESES[Number(mes) - 1];

  return (
    <>
      <PageHeader title="Fechamento" subtitle="Fechamento mensal por cliente" />

      <section className="card mb-6">
        <div className="grid gap-3 md:grid-cols-6">
          <div>
            <label>Mês</label>
            <select className="input mt-1" value={mes} onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Ano</label>
            <select className="input mt-1" value={ano} onChange={(e) => setAno(e.target.value)}>
              {ANOS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Tipo</label>
            <select
              className="input mt-1"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as TipoFiltro)}
            >
              <option value="">Todos</option>
              <option value="fixo">Mensalista</option>
              <option value="avulso">Avulso</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label>Cliente</label>
            <AutocompleteSelect
              options={clienteOptions}
              value={idCliente}
              onChange={setIdCliente}
              placeholder={loadingClientes ? 'Carregando…' : 'Digite para buscar…'}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="btn-primary" onClick={filtrar} disabled={loading || loadingClientes}>
            Filtrar
          </button>
        </div>
      </section>

      {loading ? (
        <Spinner />
      ) : resultado ? (
        resultado.comandas.length === 0 ? (
          <EmptyState
            title="Sem comandas"
            description={`Nenhuma comanda em ${mesNome} de ${ano} para este cliente.`}
          />
        ) : (
          <>
            <section className="card mb-6">
              <h2 className="mb-3 text-base">{resultado.cliente}</h2>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>#Comanda</th>
                      <th>Data</th>
                      <th>{isFixo ? 'Qtd Pacote' : 'Qtd Peças'}</th>
                      <th>{isFixo ? 'Valor Avulso' : 'Valor Total'}</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultado.comandas.map((c) => (
                      <tr key={c.id}>
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
                        <td>{formatBRL(c.valor_avulso)}</td>
                        <td>
                          {c.efetuou_pagamento === 'S' ? (
                            <span className="pill-success">Pago</span>
                          ) : (
                            <span className="pill-danger">Pendente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="font-semibold">
                    <tr className="bg-slate-50">
                      <td colSpan={2} className="text-right">Totais:</td>
                      <td>{resultado.total_pecas}</td>
                      <td>{formatBRL(resultado.total_avulso)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="card">
              <h2 className="mb-4 text-base">Resumo — {mesNome} {ano}</h2>
              <div className="space-y-2 text-sm">
                {isFixo ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Pacote ({resultado.pacote}) — {resultado.total_pecas}/{resultado.quantidade_pacote} peças
                      </span>
                      <span className="font-medium">{formatBRL(resultado.preco_pacote)}</span>
                    </div>
                    {resultado.excedente_pecas > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>
                          Excedente ({resultado.excedente_pecas} peça{resultado.excedente_pecas !== 1 ? 's' : ''})
                        </span>
                        <span className="font-medium">{formatBRL(resultado.valor_excedente)}</span>
                      </div>
                    )}
                    {resultado.total_avulso > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Peças avulsas</span>
                        <span className="font-medium">{formatBRL(resultado.total_avulso)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                      <span>Total do Mês</span>
                      <span>{formatBRL(resultado.total)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-semibold">
                    <span>Total do Mês</span>
                    <span>{formatBRL(resultado.total)}</span>
                  </div>
                )}
              </div>
              {resultado.comandas.some((c) => c.efetuou_pagamento === 'N') && (
                <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                  <button
                    className="btn-primary"
                    onClick={realizarFechamento}
                    disabled={loadingFechar}
                  >
                    {loadingFechar ? 'Fechando…' : 'Realizar Fechamento'}
                  </button>
                </div>
              )}
            </section>
          </>
        )
      ) : null}
    </>
  );
}
