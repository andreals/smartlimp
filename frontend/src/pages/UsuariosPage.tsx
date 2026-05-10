import { useEffect, useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { md5 } from '@/lib/format';
import type { Usuario } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import ChoiceChips from '@/components/ChoiceChips';
import Modal from '@/components/Modal';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fecharModal = () => setModalOpen(false);

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

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return usuarios;
    return usuarios.filter((u) =>
      `${u.nome} ${u.login} ${u.status}`.toLowerCase().includes(t),
    );
  }, [usuarios, search]);

  const novo = () => {
    setForm({ ...emptyForm });
    setModalOpen(true);
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
      setModalOpen(true);
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
      toast.success(form.id ? 'Usuário atualizado!' : 'Usuário cadastrado!');
      fecharModal();
      carregar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar usuário'));
    } finally {
      setSaving(false);
    }
  };

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
        <div className="mb-4 flex items-center justify-between gap-3">
          <input
            className="input max-w-sm"
            placeholder="Buscar por nome ou login..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar usuário"
          />
          <span className="text-xs text-slate-500">{filtered.length} usuário(s)</span>
        </div>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={usuarios.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum resultado'}
            description={usuarios.length === 0 ? undefined : 'Tente outro termo de busca.'}
            action={
              usuarios.length === 0 ? (
                <button className="btn-primary" onClick={novo}>
                  Novo Usuário
                </button>
              ) : undefined
            }
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
                {filtered.map((u) => (
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

      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={form.id ? 'Editar Usuário' : 'Novo Usuário'}
        subtitle={form.id ? 'Deixe a senha em branco para manter a atual' : undefined}
        size="md"
      >
        <form onSubmit={salvar} className="space-y-4">
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
            <label>Senha {form.id ? '(opcional)' : '*'}</label>
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
            <button type="button" className="btn-secondary" onClick={fecharModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Usuário'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
