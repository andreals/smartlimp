import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { formatBRL, maskBRLInput, parseBRL } from '@/lib/format';
import type { Peca } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import ChoiceChips from '@/components/ChoiceChips';

const iconYes = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iconNo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
  </svg>
);

const emptyForm = {
  id: undefined as number | undefined,
  nome: '',
  valor_lavar: '',
  valor_passar: '',
  valor_lavarpassar: '',
  valor_tingir: '',
  entra_pacote: 'S' as 'S' | 'N',
};

export default function PecasPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Peca[]>('/pecas');
      setPecas(data);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar peças'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const novo = () => {
    setForm({ ...emptyForm });
    setView('form');
  };

  const editar = async (id: number) => {
    try {
      const { data } = await api.get<Peca>(`/pecas/${id}`);
      setForm({
        id: data.id,
        nome: data.nome,
        valor_lavar: data.valor_lavar.toFixed(2).replace('.', ','),
        valor_passar: data.valor_passar.toFixed(2).replace('.', ','),
        valor_lavarpassar: data.valor_lavarpassar.toFixed(2).replace('.', ','),
        valor_tingir: data.valor_tingir.toFixed(2).replace('.', ','),
        entra_pacote: data.entra_pacote,
      });
      setView('form');
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar peça'));
    }
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/pecas', {
        id: form.id,
        nome: form.nome.toUpperCase(),
        valor_lavar: parseBRL(form.valor_lavar),
        valor_passar: parseBRL(form.valor_passar),
        valor_lavarpassar: parseBRL(form.valor_lavarpassar),
        valor_tingir: parseBRL(form.valor_tingir),
        entra_pacote: form.entra_pacote,
      });
      toast.success(form.id ? 'Peça atualizada!' : 'Peça cadastrada!');
      setView('list');
      carregar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar peça'));
    } finally {
      setSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <>
        <PageHeader
          title={form.id ? 'Editar Peça' : 'Nova Peça'}
          actions={
            <button className="btn-secondary" onClick={() => setView('list')}>
              Voltar
            </button>
          }
        />
        <form onSubmit={salvar} className="card space-y-4">
          <div>
            <label>Nome*</label>
            <input
              className="input mt-1 uppercase"
              required
              minLength={4}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ['valor_lavar', 'Valor Lavar (R$)'],
                ['valor_passar', 'Valor Passar (R$)'],
                ['valor_lavarpassar', 'Valor Lavar e Passar (R$)'],
                ['valor_tingir', 'Valor Tingir (R$)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label>{label}*</label>
                <input
                  className="input mt-1"
                  required
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: maskBRLInput(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
            ))}
          </div>
          <div>
            <ChoiceChips
              legend="Entra no pacote?"
              name="peca-entra-pacote"
              value={form.entra_pacote}
              onChange={(v) => setForm({ ...form, entra_pacote: v })}
              options={[
                { value: 'S', label: 'Sim', icon: iconYes },
                { value: 'N', label: 'Não', icon: iconNo },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setView('list')}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Peça'}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Peças"
        subtitle="Tabela de preços por serviço"
        actions={
          <button className="btn-primary" onClick={novo}>
            Nova Peça
          </button>
        }
      />
      <div className="card">
        {loading ? (
          <Spinner />
        ) : pecas.length === 0 ? (
          <EmptyState
            title="Nenhuma peça cadastrada"
            action={<button className="btn-primary" onClick={novo}>Nova Peça</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Lavar</th>
                  <th>Passar</th>
                  <th>Lavar e Passar</th>
                  <th>Tingir</th>
                  <th>Pacote</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pecas.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-slate-800">{p.nome}</td>
                    <td>{formatBRL(p.valor_lavar)}</td>
                    <td>{formatBRL(p.valor_passar)}</td>
                    <td>{formatBRL(p.valor_lavarpassar)}</td>
                    <td>{formatBRL(p.valor_tingir)}</td>
                    <td>
                      {p.entra_pacote === 'S' ? (
                        <span className="pill-success">Sim</span>
                      ) : (
                        <span className="pill-warning">Não</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-secondary text-xs" onClick={() => editar(p.id)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
