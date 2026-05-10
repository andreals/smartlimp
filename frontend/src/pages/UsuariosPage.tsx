import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { md5 } from '@/lib/format';
import type { Usuario } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import ChoiceChips from '@/components/ChoiceChips';

const iconAtivo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <circle cx="12" cy="12" r="8" />
    <path d="m8.5 12 2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iconInativo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <circle cx="12" cy="12" r="8" />
    <path d="M8.5 8.5l7 7m0-7-7 7" strokeLinecap="round" />
  </svg>
);

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
      toast.error(extractError(err, 'Erro ao carregar usu?rios'));
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
      toast.error(extractError(err, 'Erro ao carregar usu?rio'));
    }
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (form.nome.length < 4 || form.login.length < 3) {
      toast.error('Nome e login muito curtos');
      return;
    }
    if (!form.id && form.senha.length < 5) {
      toast.error('Senha deve ter no m?nimo 5 caracteres');
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
      toast.success(form.id ? 'Usu?rio atualizado!' : 'Usu?rio cadastrado!');
      setView('list');
      carregar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar usu?rio'));
    } finally {
      setSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <>
        <PageHeader
          title={form.id ? 'Editar Usu?rio' : 'Novo Usu?rio'}
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
            <ChoiceChips
              legend="Status"
              name="usuario-status"
              value={form.status}
              onChange={(status) => setForm({ ...form, status })}
              options={[
                { value: 'ativo', label: 'Ativo', icon: iconAtivo },
                { value: 'inativo', label: 'Inativo', icon: iconInativo },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setView('list')}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Usu?rio'}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Usu?rios"
        subtitle="Operadores do sistema"
        actions={
          <button className="btn-primary" onClick={novo}>
            Novo Usu?rio
          </button>
        }
      />
      <div className="card">
        {loading ? (
          <Spinner />
        ) : usuarios.length === 0 ? (
          <EmptyState
            title="Nenhum usu?rio cadastrado"
            action={<button className="btn-primary" onClick={novo}>Novo Usu?rio</button>}
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
