import { useEffect, useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { maskCEP, maskPhone, unmask } from '@/lib/format';
import type { Cliente, Pacote } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

const emptyForm = {
  id: undefined as number | undefined,
  nome: '',
  id_pacote: '' as string,
  telefone: '',
  celular: '',
  email: '',
  tipo: 'avulso' as 'avulso' | 'fixo',
  antecipado: 'S' as 'S' | 'N',
  frequencia_pagamento: 'mensal',
  dia_vencimento: '',
  cep: '',
  numero: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
  status: 'ativo' as 'ativo' | 'inativo',
};

export default function ClientesPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [parecidos, setParecidos] = useState<{ id: number; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        api.get<Cliente[]>('/clientes'),
        api.get<Pacote[]>('/pacotes'),
      ]);
      setClientes(c.data);
      setPacotes(p.data);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar clientes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) =>
      `${c.nome} ${c.bairro} ${c.celular} ${c.telefone}`.toLowerCase().includes(t),
    );
  }, [clientes, search]);

  const novo = () => {
    setForm({ ...emptyForm });
    setParecidos([]);
    setView('form');
  };

  const editar = async (id: number) => {
    try {
      const { data } = await api.get<Cliente>(`/clientes/${id}`);
      setForm({
        id: data.id,
        nome: data.nome,
        id_pacote: data.id_pacote ? String(data.id_pacote) : '',
        telefone: maskPhone(data.telefone || ''),
        celular: maskPhone(data.celular || ''),
        email: data.email || '',
        tipo: data.tipo,
        antecipado: data.antecipado,
        frequencia_pagamento: data.frequencia_pagamento || 'mensal',
        dia_vencimento: data.dia_vencimento || '',
        cep: maskCEP(data.cep || ''),
        numero: data.numero || '',
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        uf: data.uf || '',
        status: data.status,
      });
      setView('form');
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar cliente'));
    }
  };

  const buscarCep = async (cepRaw: string) => {
    const cep = unmask(cepRaw);
    if (cep.length !== 8) return;
    try {
      const { data } = await api.get<{
        logradouro: string;
        bairro: string;
        cidade: string;
        uf: string;
      }>(`/cep/${cep}`);
      setForm((f) => ({
        ...f,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,
      }));
    } catch (err) {
      toast.error(extractError(err, 'CEP não encontrado'));
    }
  };

  const buscarParecidos = async (nome: string) => {
    if (nome.trim().length < 3) {
      setParecidos([]);
      return;
    }
    try {
      const { data } = await api.get<{ id: number; nome: string }[]>(
        `/clientes/parecidos?nome=${encodeURIComponent(nome)}`,
      );
      setParecidos(data.filter((p) => p.id !== form.id));
    } catch {
      setParecidos([]);
    }
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        id: form.id,
        nome: form.nome,
        id_pacote: form.id_pacote ? Number(form.id_pacote) : null,
        telefone: unmask(form.telefone),
        celular: unmask(form.celular),
        email: form.email,
        tipo: form.tipo,
        antecipado: form.antecipado,
        frequencia_pagamento: form.frequencia_pagamento,
        dia_vencimento: form.dia_vencimento,
        cep: unmask(form.cep),
        numero: form.numero,
        logradouro: form.logradouro,
        bairro: form.bairro,
        cidade: form.cidade,
        uf: form.uf,
        status: form.status,
      };
      await api.post('/clientes', payload);
      toast.success(form.id ? 'Cliente atualizado!' : 'Cliente cadastrado!');
      setView('list');
      carregar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar cliente'));
    } finally {
      setSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <>
        <PageHeader
          title={form.id ? 'Editar Cliente' : 'Novo Cliente'}
          subtitle="Preencha os dados do cliente"
          actions={
            <button className="btn-secondary" onClick={() => setView('list')}>
              Voltar
            </button>
          }
        />
        <form onSubmit={salvar} className="space-y-6">
          <section className="card">
            <h2 className="mb-4 text-base">Identificação</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label>Nome*</label>
                <input
                  className="input mt-1 uppercase"
                  required
                  minLength={5}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  onBlur={(e) => buscarParecidos(e.target.value)}
                />
                {parecidos.length > 0 && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <p className="mb-1 font-semibold">Existem clientes com nomes parecidos:</p>
                    <ul className="space-y-0.5">
                      {parecidos.map((p) => (
                        <li key={p.id}>• {p.nome}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label>Pacote</label>
                <select
                  className="input mt-1"
                  value={form.id_pacote}
                  onChange={(e) => setForm({ ...form, id_pacote: e.target.value })}
                >
                  <option value="">Sem pacote</option>
                  {pacotes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>E-mail</label>
                <input
                  type="email"
                  className="input mt-1"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label>Telefone</label>
                <input
                  className="input mt-1"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
                />
              </div>
              <div>
                <label>Celular</label>
                <input
                  className="input mt-1"
                  value={form.celular}
                  onChange={(e) => setForm({ ...form, celular: maskPhone(e.target.value) })}
                />
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 text-base">Pagamento</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label>Tipo</label>
                <div className="mt-2 flex gap-3">
                  {(['avulso', 'fixo'] as const).map((t) => (
                    <label key={t} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={form.tipo === t}
                        onChange={() => setForm({ ...form, tipo: t })}
                      />
                      {t === 'avulso' ? 'Avulso' : 'Fixo'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label>Antecipado</label>
                <div className="mt-2 flex gap-3">
                  {(['S', 'N'] as const).map((t) => (
                    <label key={t} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={form.antecipado === t}
                        onChange={() => setForm({ ...form, antecipado: t })}
                      />
                      {t === 'S' ? 'Sim' : 'Não'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label>Frequência</label>
                <select
                  className="input mt-1"
                  value={form.frequencia_pagamento}
                  onChange={(e) =>
                    setForm({ ...form, frequencia_pagamento: e.target.value })
                  }
                >
                  <option value="diario">Diário</option>
                  <option value="semanal">Semanal</option>
                  <option value="dezenal">Dezenal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              <div>
                <label>Dia Vencimento</label>
                <input
                  className="input mt-1"
                  value={form.dia_vencimento}
                  onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 text-base">Endereço</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label>CEP*</label>
                <input
                  className="input mt-1"
                  required
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: maskCEP(e.target.value) })}
                  onBlur={(e) => buscarCep(e.target.value)}
                />
              </div>
              <div>
                <label>Número*</label>
                <input
                  className="input mt-1"
                  required
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                />
              </div>
              <div>
                <label>UF*</label>
                <input
                  className="input mt-1 uppercase"
                  required
                  maxLength={2}
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="md:col-span-2">
                <label>Logradouro*</label>
                <input
                  className="input mt-1"
                  required
                  value={form.logradouro}
                  onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                />
              </div>
              <div>
                <label>Bairro*</label>
                <input
                  className="input mt-1"
                  required
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                />
              </div>
              <div>
                <label>Cidade*</label>
                <input
                  className="input mt-1"
                  required
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="card">
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
          </section>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setView('list')}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie sua base de clientes"
        actions={
          <button className="btn-primary" onClick={novo}>
            Novo Cliente
          </button>
        }
      />
      <div className="card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <input
            className="input max-w-sm"
            placeholder="Buscar por nome, bairro ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-xs text-slate-500">{filtered.length} cliente(s)</span>
        </div>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Cadastre o primeiro cliente para começar."
            action={<button className="btn-primary" onClick={novo}>Novo Cliente</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Pacote</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-slate-800">{c.nome}</td>
                    <td>{c.celular || c.telefone || '-'}</td>
                    <td>{c.pacote || '-'}</td>
                    <td className="capitalize">{c.tipo}</td>
                    <td>
                      {c.status === 'ativo' ? (
                        <span className="pill-success">Ativo</span>
                      ) : (
                        <span className="pill-danger">Inativo</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-secondary text-xs" onClick={() => editar(c.id)}>
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
