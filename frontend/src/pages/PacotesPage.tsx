import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { formatBRL, maskBRLInput, parseBRL } from '@/lib/format';
import type { Pacote } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import TipoServicoRadios, { type TipoServico } from '@/components/TipoServicoRadios';

const emptyForm = {
  id: undefined as number | undefined,
  nome: '',
  tipo: 'lavar' as TipoServico,
  preco: '',
  quantidade: '',
};

export default function PacotesPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Pacote[]>('/pacotes');
      setPacotes(data);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar pacotes'));
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
      const { data } = await api.get<Pacote>(`/pacotes/${id}`);
      setForm({
        id: data.id,
        nome: data.nome,
        tipo: data.tipo as TipoServico,
        preco: data.preco.toFixed(2).replace('.', ','),
        quantidade: String(data.quantidade),
      });
      setView('form');
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar pacote'));
    }
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/pacotes', {
        id: form.id,
        nome: form.nome,
        tipo: form.tipo,
        preco: parseBRL(form.preco),
        quantidade: Number(form.quantidade),
      });
      toast.success(form.id ? 'Pacote atualizado!' : 'Pacote cadastrado!');
      setView('list');
      carregar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar pacote'));
    } finally {
      setSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <>
        <PageHeader
          title={form.id ? 'Editar Pacote' : 'Novo Pacote'}
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
              className="input mt-1"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <TipoServicoRadios
              name="pacote-tipo-servico"
              legend="Tipo"
              value={form.tipo}
              onChange={(v) => v && setForm({ ...form, tipo: v })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label>Preço (R$)*</label>
              <input
                className="input mt-1"
                required
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: maskBRLInput(e.target.value) })}
                placeholder="0,00"
              />
            </div>
            <div>
              <label>Quantidade*</label>
              <input
                className="input mt-1"
                required
                type="number"
                min={1}
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setView('list')}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Pacote'}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pacotes"
        subtitle="Defina os pacotes oferecidos aos clientes"
        actions={
          <button className="btn-primary" onClick={novo}>
            Novo Pacote
          </button>
        }
      />
      <div className="card">
        {loading ? (
          <Spinner />
        ) : pacotes.length === 0 ? (
          <EmptyState
            title="Nenhum pacote cadastrado"
            action={<button className="btn-primary" onClick={novo}>Novo Pacote</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Preço</th>
                  <th>Quantidade</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pacotes.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-slate-800">{p.nome}</td>
                    <td className="capitalize">{p.tipo}</td>
                    <td>{formatBRL(p.preco)}</td>
                    <td>{p.quantidade}</td>
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
