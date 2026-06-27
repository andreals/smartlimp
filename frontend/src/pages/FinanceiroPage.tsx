import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import {
  formatBRL,
  formatClienteAutocompleteMeta,
  isValidBRDate,
} from '@/lib/format';
import type { Cliente, ComandaResumo } from '@/types';
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

export default function FinanceiroPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [idCliente, setIdCliente] = useState('');
  const [dataInicio, setDataInicio] = useState(INICIO_SEMANA);
  const [dataFim, setDataFim] = useState(HOJE);

  const [comandas, setComandas] = useState<ComandaResumo[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(false);

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
                  <tr key={c.id}>
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
                ))}
              </tbody>
              <tfoot className="font-semibold">
                <tr className="bg-slate-50">
                  <td colSpan={3} className="text-right">Totais:</td>
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
