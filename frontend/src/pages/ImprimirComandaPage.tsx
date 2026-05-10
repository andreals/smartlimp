import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, extractError } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import type { Impressao } from '@/types';
import Spinner from '@/components/Spinner';

const tipoLabel: Record<string, string> = {
  L: 'Lavar',
  P: 'Passar',
  LP: 'Lavar e Passar',
  T: 'Tingir',
};

function Via({ data, label }: { data: Impressao; label: string }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border border-slate-300 p-3 text-[11px] print:break-inside-avoid">
      <header className="mb-2 flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
        <div>
          <div className="text-base font-bold">Smart Limp</div>
          <div>Rua Marcos Luiz Sposaro, 98 - Nova Petrópolis - São Bernardo do Campo - SP</div>
          <div>Cel: (11) 9 4230-7072 / (11) 9 4230-7072</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">#{data.numero}</div>
          <div className="text-blue-600">({label})</div>
        </div>
      </header>

      <div className="mb-2">
        <div className="text-base font-bold uppercase">{data.cliente}</div>
        <div className="text-[10px] text-slate-600">
          {data.logradouro}, {data.numero_casa} • {data.bairro} • {data.cidade}
        </div>
        <div className="text-[10px] text-slate-600">
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
                <th className="border border-slate-300 bg-slate-100 px-1 text-left">Total Pacote</th>
                <td className="border border-slate-300 px-1">{data.total_vencimento}</td>
              </>
            )}
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-slate-300">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-1 text-left">Qtd</th>
            <th className="border border-slate-300 px-1 text-left">Descrição</th>
            <th className="border border-slate-300 px-1 text-left">Serviço</th>
            <th className="border border-slate-300 px-1 text-right">Valor</th>
            <th className="border border-slate-300 px-1 text-right">Sub-Total</th>
          </tr>
        </thead>
        <tbody>
          {data.pecas.map((p, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-1">{p.quantidade}</td>
              <td className="border border-slate-300 px-1">{p.descricao}</td>
              <td className="border border-slate-300 px-1">{tipoLabel[p.tipo_servico] || p.tipo}</td>
              <td className="border border-slate-300 px-1 text-right">{formatBRL(p.valor_peca)}</td>
              <td className="border border-slate-300 px-1 text-right">{formatBRL(p.valor_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={2} className="border border-slate-300 bg-slate-50 px-1 text-right">Sub-Total:</th>
            <th className="border border-slate-300 bg-slate-50 px-1 text-right">{formatBRL(data.sub_total)}</th>
            <th className="border border-slate-300 bg-slate-50 px-1 text-right">Desconto:</th>
            <td className="border border-slate-300 bg-slate-50 px-1 text-right">{formatBRL(data.desconto)}</td>
          </tr>
          <tr>
            <th colSpan={2} className="border border-slate-300 bg-slate-50 px-1 text-right">Saldo:</th>
            <td className="border border-slate-300 bg-slate-50 px-1 text-right">{formatBRL(data.saldo)}</td>
            <th className="border border-slate-300 bg-slate-50 px-1 text-right">Acréscimo:</th>
            <td className="border border-slate-300 bg-slate-50 px-1 text-right">{formatBRL(data.acrescimo)}</td>
          </tr>
          <tr>
            <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1 text-right">Total de Peças:</th>
            <th className="border border-slate-300 bg-slate-100 px-1 text-right">{data.total_pecas}</th>
            <th className="border border-slate-300 bg-slate-100 px-1 text-right">Valor:</th>
            <th className="border border-slate-300 bg-slate-100 px-1 text-right text-base">
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
      <div className="mt-3 shrink-0 text-center text-[10px] text-rose-600 print:mt-2">
        Estou ciente que as roupas não retiradas em 90 dias serão colocadas à venda.
      </div>
    </div>
  );
}
