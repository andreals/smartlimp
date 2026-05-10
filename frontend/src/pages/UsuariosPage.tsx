import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { md5 } from '@/lib/format';
import type { Usuario } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

const emptyForm = {
  id: undefined as number | undefined,
  nome: '',
  login: '',
  senha: '',
  status: 'ativo' as 'ativo' | 'inativo',
};

export default function UsuariosPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Usuario[]>('/usuarios');
      setUsuarios(data);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar usuários'));
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
      const { data } = await api.get<Usuario>(`/usuarios/${id}`);
      setForm({
        id: data.id,
        nome: data.nome,
        login: data.login,
        senha: '',
        status: data.status,
      });
      setView('form');
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar usuário'));
    }
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (form.nome.length < 4 || form.login.length < 3) {
      toast.error('Nome e login muito curtos');
      return;
    }
    if (!form.id && form.senha.length < 5) {
      toast.error('Senha deve ter no mínimo 5 caracteres');
      return;
    }
    setSaving(true);
    try {
      let senhaHash = form.senha;
      if (senhaHash && senhaHash.length !== 32) {
        senhaHash = await md5(senhaHash);
      }
      await api.post('/usuarios', {
        id: form.id,
        nome: form.nome,
        login: form.login,
        senha: senhaHash || undefined,
        status: form.status,
      });
      toast.success(form.id ? 'Usuário atualizado!' : 'Usuário cadastrado!');
      setView('list');
      carregar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar usuário'));
    } finally {
      setSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <>
        <PageHeader
          title={form.id ? 'Editar Usuário' : 'Novo Usuário'}
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
            <label>Login*</label>
            <input
              className="input mt-1"
              required
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
            />
          </div>
          <div>
            <label>Senha {form.id ? '(deixe em branco para manter)' : '*'}</label>
            <input
              className="input mt-1"
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </div>
          <div>
            <label>Status</label>
            <div className="mt-2 flex gap-3">
              {(['ativo', 'inativo'] as const).map((s) => (
                <label key={s} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.status === s}
                    onChange={() => setForm({ ...form, status: s })}
                  />
                  {s === 'ativo' ? 'Ativo' : 'Inativo'}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setView('list')}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Usuário'}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Operadores do sistema"
        actions={
          <button className="btn-primary" onClick={novo}>
            Novo Usuário
          </button>
        }
      />
      <div className="card">
        {loading ? (
          <Spinner />
        ) : usuarios.length === 0 ? (
          <EmptyState
            title="Nenhum usuário cadastrado"
            action={<button className="btn-primary" onClick={novo}>Novo Usuário</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-slate-800">{u.nome}</td>
                    <td>{u.login}</td>
                    <td>
                      {u.status === 'ativo' ? (
                        <span className="pill-success">Ativo</span>
                      ) : (
                        <span className="pill-danger">Inativo</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-secondary text-xs" onClick={() => editar(u.id)}>
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
