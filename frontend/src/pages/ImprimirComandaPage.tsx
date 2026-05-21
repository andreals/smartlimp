import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, extractError } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import type { Impressao } from '@/types';
import Spinner from '@/components/Spinner';

const servicoAbrev: Record<string, string> = {
  L: 'L',
  P: 'P',
  LP: 'LP',
  T: 'T',
  lavar: 'L',
  passar: 'P',
  lavarpassar: 'LP',
  tingir: 'T',
};

function Via({ data, label }: { data: Impressao; label: string }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border border-slate-300 p-3 text-[12px] leading-snug print:break-inside-avoid print:text-[11.5px]">
      <header className="mb-2 flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
        <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] grid-rows-[auto_auto_auto] gap-x-2 gap-y-0.5 pr-2">
          <img
            src="/smart_limp.png"
            alt="Smart Limp"
            className="row-span-2 h-[2.35rem] w-auto max-w-[5.5rem] self-center object-contain object-left print:h-[2.25rem] print:max-w-[5rem]"
          />
          <div className="text-base font-bold leading-tight">Smart Limp</div>
          <div className="leading-snug">
            Rua Marcos Luiz Sposaro, 98 • Nova Petrópolis • São Bernardo do Campo • SP
          </div>
          <div className="col-start-2">Cel: (11) 9 4230-7072 / (11) 9 4230-7072</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">#{data.numero}</div>
          <div className="text-blue-600">({label})</div>
        </div>
      </header>

      <div className="mb-2">
        <div className="text-xl font-bold uppercase leading-tight tracking-tight text-slate-900 sm:text-2xl">
          {data.cliente}
        </div>
        <div className="mt-1 text-[11px] text-slate-600">
          {data.logradouro}, {data.numero_casa} • {data.bairro} • {data.cidade}
        </div>
        <div className="text-[11px] text-slate-600">
          Tel: {data.telefone} {data.celular ? `/ ${data.celular}` : ''}
        </div>
      </div>

      <table className="mb-2 w-full border border-slate-300">
        <tbody>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-1 text-left">Pacote</th>
            <td className="border border-slate-300 px-1">{data.pacote || '-'}</td>
            <th className="border border-slate-300 bg-slate-100 px-1 text-left">Data</th>
            <td className="border border-slate-300 px-1">{data.data_comanda}</td>
            {data.tipo_cliente === 'fixo' && (
              <>
                <th className="border border-slate-300 bg-slate-100 px-1 text-left">
                  {data.antecipado === 'S' ? 'Restante Pacote' : 'Total Pacote'}
                </th>
                <td className="border border-slate-300 px-1">{data.total_vencimento}</td>
              </>
            )}
          </tr>
        </tbody>
      </table>

      <table className="w-full table-fixed border border-slate-300">
        <colgroup>
          <col className="w-[2.35rem]" />
          <col />
          <col className="w-[3.5rem]" />
          <col className="w-[5rem]" />
          <col className="w-[4.5rem]" />
        </colgroup>
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-1 text-center">Qtd</th>
            <th className="border border-slate-300 px-1 text-left">Descrição</th>
            <th className="border border-slate-300 px-1 text-center">Serviço</th>
            <th className="border border-slate-300 px-1 text-right">Valor</th>
            <th className="border border-slate-300 px-0.5 text-right">Sub-Total</th>
          </tr>
        </thead>
        <tbody>
          {data.pecas.map((p, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-1 text-center text-[13px] font-bold tabular-nums">
                {p.quantidade}
              </td>
              <td className="border border-slate-300 px-1">{p.descricao}</td>
              <td className="border border-slate-300 px-1 text-center text-[13px] font-medium">
                {servicoAbrev[p.tipo_servico] ?? servicoAbrev[p.tipo] ?? p.tipo_servico}
              </td>
              <td className="border border-slate-300 px-1 text-right text-[13px] tabular-nums leading-tight">
                {formatBRL(p.valor_peca)}
              </td>
              <td className="border border-slate-300 px-0.5 text-right text-[11px] tabular-nums leading-tight">
                {formatBRL(p.valor_total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={2} className="border border-slate-300 bg-slate-50 px-1 text-right">
              Sub-Total:
            </th>
            <th className="border border-slate-300 bg-slate-50 px-0.5 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.sub_total)}
            </th>
            <th className="border border-slate-300 bg-slate-50 px-1 text-right">Desconto:</th>
            <td className="border border-slate-300 bg-slate-50 px-0.5 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.desconto)}
            </td>
          </tr>
          <tr>
            <th colSpan={2} className="border border-slate-300 bg-slate-50 px-1 text-right">
              Saldo:
            </th>
            <td className="border border-slate-300 bg-slate-50 px-0.5 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.saldo)}
            </td>
            <th className="border border-slate-300 bg-slate-50 px-1 text-right">Acréscimo:</th>
            <td className="border border-slate-300 bg-slate-50 px-0.5 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.acrescimo)}
            </td>
          </tr>
          <tr>
            <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1 text-right">
              Total de Peças:
            </th>
            <th className="border border-slate-300 bg-slate-100 px-0.5 text-center font-bold tabular-nums">
              {data.total_pecas}
            </th>
            <th className="border border-slate-300 bg-slate-100 px-1 text-right text-sm font-bold">
              Valor:
            </th>
            <th className="border border-slate-300 bg-slate-100 px-0.5 text-right text-lg font-bold tabular-nums leading-tight print:text-xl">
              {formatBRL(data.total_valor)}
            </th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function ImprimirComandaPage() {
  const { id } = useParams();
  const [data, setData] = useState<Impressao | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Comanda inválida (sem ID na URL).');
      return;
    }
    let cancelled = false;
    api
      .get<Impressao>(`/comandas/${id}/impressao`)
      .then(({ data: d }) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(extractError(err, 'Erro ao carregar comanda'));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (data) {
      setTimeout(() => window.print(), 400);
    }
  }, [data]);

  if (error) return <div className="p-8 text-rose-600">{error}</div>;
  if (!data) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="flex min-h-screen flex-col bg-white p-2 print:min-h-0">
      <div className="comanda-impressao-vias grid min-h-0 w-full flex-1 grid-cols-2 auto-rows-fr gap-2 print:auto-rows-auto print:flex-none print:grid-cols-2 print:gap-3">
        <Via data={data} label="via Cliente" />
        <Via data={data} label="via Lavanderia" />
      </div>
    </div>
  );
}
