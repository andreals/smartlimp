import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
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

function Via({ data }: { data: Impressao }) {
  const phones = [data.telefone?.trim(), data.celular?.trim()].filter(Boolean);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border border-slate-200 p-3 text-[12px] leading-snug print:break-inside-avoid print:border-slate-300 print:text-[11.5px]">
      <header className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] grid-rows-[auto_auto_auto] gap-x-2 gap-y-0.5 pr-2">
          <img
            src="/smart_limp.png"
            alt="Smart Limp"
            className="row-span-2 h-[3.6rem] w-auto max-w-[8rem] self-center object-contain object-left print:h-[3.5rem] print:max-w-[7.5rem]"
          />
          <div className="text-base font-bold leading-tight">Smart Limp</div>
          <div className="leading-snug text-slate-500">
            Rua Marcos Luiz Sposaro, 98 • Nova Petrópolis • São Bernardo do Campo • SP
          </div>
          <div className="col-start-2 text-slate-500">Cel: (11) 9 4230-7072 / (11) 9 4230-7072</div>
        </div>
        <div className="shrink-0">
          <div className="rounded-lg bg-slate-800 px-2.5 py-1 text-lg font-bold tabular-nums text-white">
            #{data.numero}
          </div>
        </div>
      </header>

      <div className="mb-3">
        <div className="text-xl font-bold uppercase leading-tight tracking-tight text-slate-900 sm:text-2xl">
          {data.cliente}
        </div>
        <div className="mt-0.5 text-[12.5px] font-medium text-slate-600">
          {data.logradouro}, {data.numero_casa} • {data.bairro} • {data.cidade}
        </div>
        {phones.length > 0 && (
          <div className="text-[11px] text-slate-500">Tel: {phones.join(' / ')}</div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-0.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px]">
        <span>
          <span className="font-semibold text-slate-500">Pacote: </span>
          <span className="font-medium">{data.pacote || '-'}</span>
        </span>
        <span>
          <span className="font-semibold text-slate-500">Data: </span>
          <span>{data.data_comanda}</span>
        </span>
        {data.tipo_cliente === 'fixo' && (
          <span>
            <span className="font-semibold text-slate-500">
              {data.antecipado === 'S' ? 'Restante Pacote: ' : 'Total Pacote: '}
            </span>
            <span className="font-bold">{data.total_vencimento}</span>
          </span>
        )}
      </div>

      <table className="w-full table-fixed border border-slate-200">
        <colgroup>
          <col className="w-[2.6rem]" />
          <col />
          <col className="w-[3.9rem]" />
          <col className="w-[5.5rem]" />
          <col className="w-[5.9rem]" />
        </colgroup>
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="overflow-hidden px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider">
              Qtd
            </th>
            <th className="overflow-hidden px-1.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider">
              Descrição
            </th>
            <th className="overflow-hidden px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider">
              Serv.
            </th>
            <th className="overflow-hidden px-1.5 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">
              Valor
            </th>
            <th className="overflow-hidden px-1.5 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider">
              Sub-Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.pecas.map((p, i) => (
            <tr key={i} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : 'bg-white'}`}>
              <td className="overflow-hidden px-1.5 py-1 text-center text-[13px] font-bold tabular-nums">
                {p.quantidade}
              </td>
              <td className="overflow-hidden break-words px-1.5 py-1">{p.descricao}</td>
              <td className="overflow-hidden px-1.5 py-1 text-center text-[13px] font-medium">
                {servicoAbrev[p.tipo_servico] ?? servicoAbrev[p.tipo] ?? p.tipo_servico}
              </td>
              <td className="overflow-hidden whitespace-nowrap px-1.5 py-1 text-right text-[12px] tabular-nums leading-tight">
                {formatBRL(p.valor_peca)}
              </td>
              <td className="overflow-hidden whitespace-nowrap px-1.5 py-1 text-right text-[11px] tabular-nums leading-tight">
                {formatBRL(p.valor_total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50">
            <td colSpan={2} className="overflow-hidden px-2 py-1 text-right text-[11px] text-slate-500">
              Sub-Total:
            </td>
            <td className="overflow-hidden px-1 py-1 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.sub_total)}
            </td>
            <td className="overflow-hidden px-2 py-1 text-right text-[11px] text-slate-500">Desconto:</td>
            <td className="overflow-hidden px-1 py-1 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.desconto)}
            </td>
          </tr>
          <tr className="border-t border-slate-100 bg-slate-50">
            <td colSpan={2} className="overflow-hidden px-2 py-1 text-right text-[11px] text-slate-500">
              Saldo:
            </td>
            <td className="overflow-hidden px-1 py-1 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.saldo)}
            </td>
            <td className="overflow-hidden px-2 py-1 text-right text-[11px] text-slate-500">Acréscimo:</td>
            <td className="overflow-hidden px-1 py-1 text-right text-[11px] tabular-nums leading-tight">
              {formatBRL(data.acrescimo)}
            </td>
          </tr>
          <tr className="border-t-2 border-slate-300 bg-white">
            <td colSpan={2} className="overflow-hidden px-2 py-1.5 text-right text-[11px] font-semibold text-slate-600">
              Total de Peças:
            </td>
            <td className="overflow-hidden px-1 py-1.5 text-center text-sm font-bold tabular-nums">
              {data.total_pecas}
            </td>
            <td className="overflow-hidden px-2 py-1.5 text-right text-[11px] font-semibold text-slate-600">
              Valor:
            </td>
            <td className="overflow-hidden whitespace-nowrap px-1 py-1.5 text-right text-base font-bold tabular-nums leading-tight print:text-lg">
              {formatBRL(data.total_valor)}
            </td>
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

  const gerarImagemComanda = async () => {
    if (!data) return null;
    const root = document.getElementById('comanda-via-unica');
    if (!root) return null;

    const canvas = await html2canvas(root, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (_doc, el) => {
        el.querySelectorAll<HTMLElement>('td, th').forEach((cell) => {
          cell.style.overflow = 'hidden';
        });
      },
    });

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((fileBlob) => resolve(fileBlob), 'image/png');
    });
    if (!blob) return null;

    return new File([blob], `comanda-${data.numero}.png`, { type: 'image/png' });
  };

  const compartilharNoWhatsApp = async () => {
    if (!data) return;
    const imagem = await gerarImagemComanda();

    if (
      imagem &&
      typeof navigator !== 'undefined' &&
      'share' in navigator &&
      'canShare' in navigator &&
      navigator.canShare?.({ files: [imagem] })
    ) {
      try {
        await navigator.share({
          title: `Comanda #${data.numero}`,
          text: `${data.total_pecas} ${data.total_pecas === 1 ? 'peça' : 'peças'} • Total: ${formatBRL(data.total_valor)}`,
          files: [imagem],
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Erro real — cai no fallback abaixo.
      }
    }

    if (imagem) {
      const imageUrl = URL.createObjectURL(imagem);
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
      toast('Seu navegador não compartilha imagem direto no WhatsApp. A imagem foi aberta para você enviar.');
      return;
    }

    toast.error('Não foi possível gerar a imagem da comanda.');
  };

  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-rose-600">
        {error}
      </div>
    );
  if (!data)
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Spinner />
      </div>
    );

  return (
    <div className="min-h-screen py-8 print:min-h-0 print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
        <div className="mb-6 print:hidden">
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Comanda
          </p>
          <h1 className="mb-4">
            #{data.numero} — {data.cliente}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              Imprimir / Salvar PDF
            </button>
            <button type="button" className="btn-secondary" onClick={compartilharNoWhatsApp}>
              Compartilhar no WhatsApp
            </button>
          </div>
        </div>

        <div
          id="comanda-via-unica"
          className="overflow-hidden rounded-2xl shadow-card print:rounded-none print:shadow-none"
        >
          <Via data={data} />
        </div>
      </div>
    </div>
  );
}
