import { useEffect, useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { maskCEP, maskPhone, unmask } from '@/lib/format';
import type { Cliente, Pacote } from '@/types';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import ChoiceChips from '@/components/ChoiceChips';
import AutocompleteSelect from '@/components/AutocompleteSelect';
import Modal from '@/components/Modal';
import ClienteTipoBadge from '@/components/ClienteTipoBadge';

const iconAvulso = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M5 4h14v16H5z" />
    <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
  </svg>
);
const iconFixo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
  </svg>
);
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
const iconAtivo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const iconInativo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <circle cx="12" cy="12" r="8" /><path d="M8.5 8.5l7 7m0-7-7 7" strokeLinecap="round" />
  </svg>
);

const clienteTipoOptions = [
  { value: 'avulso' as const, label: 'Avulso', icon: iconAvulso },
  { value: 'fixo' as const, label: 'Fixo', icon: iconFixo },
];

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
  const [modalOpen, setModalOpen] = useState(false);
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

  const pacoteOptions = useMemo(
    () => pacotes.map((p) => ({ value: String(p.id), label: p.nome })),
    [pacotes],
  );

  const frequenciaOptions = useMemo(
    () => [
      { value: 'diario', label: 'Diário' },
      { value: 'semanal', label: 'Semanal' },
      { value: 'dezenal', label: 'Dezenal' },
      { value: 'quinzenal', label: 'Quinzenal' },
      { value: 'mensal', label: 'Mensal' },
    ],
    [],
  );

  const novo = () => {
    setForm({ ...emptyForm });
    setParecidos([]);
    setModalOpen(true);
  };

  const fecharModal = () => setModalOpen(false);

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
      setModalOpen(true);
    } catch (err) {
      toast.error(extractError(err, 'Erro ao carregar cliente'));
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const cep = unmask(form.cep);
    if (cep.length !== 8) return;

    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const { data } = await api.get<{
          logradouro: string;
          bairro: string;
          cidade: string;
          uf: string;
        }>(`/cep/${cep}`);
        if (cancelled) return;
        setForm((f) =>
          unmask(f.cep) !== cep
            ? f
            : {
                ...f,
                logradouro: data.logradouro,
                bairro: data.bairro,
                cidade: data.cidade,
                uf: data.uf,
              },
        );
      } catch (err) {
        if (cancelled) return;
        toast.error(extractError(err, 'CEP não encontrado'));
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [modalOpen, form.cep]);

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
      fecharModal();
      carregar();
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar cliente'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={form.id ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle="Preencha os dados do cliente"
        size="xl"
      >
        <form onSubmit={salvar} className="space-y-6">
          <section className="card">
            <h2 className="mb-4 text-base">Identificação</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label>Nome*</label>
                <input
                  className="input mt-1 uppercase"
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
                <label htmlFor="cliente-pacote">Pacote</label>
                <AutocompleteSelect
                  id="cliente-pacote"
                  options={pacoteOptions}
                  value={form.id_pacote}
                  onChange={(id_pacote) => setForm({ ...form, id_pacote })}
                  placeholder="Sem pacote — digite para buscar"
                />
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
                <ChoiceChips
                  legend="Tipo"
                  name="cliente-tipo"
                  value={form.tipo}
                  onChange={(tipo) => setForm({ ...form, tipo })}
                  options={clienteTipoOptions}
                />
              </div>
              <div>
                <ChoiceChips
                  legend="Antecipado"
                  name="cliente-antecipado"
                  value={form.antecipado}
                  onChange={(antecipado) => setForm({ ...form, antecipado })}
                  options={[
                    { value: 'S', label: 'Sim', icon: iconYes },
                    { value: 'N', label: 'Não', icon: iconNo },
                  ]}
                />
              </div>
              <div>
                <label htmlFor="cliente-frequencia">Frequência</label>
                <AutocompleteSelect
                  id="cliente-frequencia"
                  options={frequenciaOptions}
                  value={form.frequencia_pagamento}
                  onChange={(frequencia_pagamento) =>
                    setForm({ ...form, frequencia_pagamento })
                  }
                  placeholder="Frequência de pagamento"
                />
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
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: maskCEP(e.target.value) })}
                />
              </div>
              <div>
                <label>Número*</label>
                <input
                  className="input mt-1"
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                />
              </div>
              <div>
                <label>UF*</label>
                <input
                  className="input mt-1 uppercase"
                  maxLength={2}
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="md:col-span-2">
                <label>Logradouro*</label>
                <input
                  className="input mt-1 uppercase"
                  value={form.logradouro}
                  onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                />
              </div>
              <div>
                <label>Bairro*</label>
                <input
                  className="input mt-1"
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                />
              </div>
              <div>
                <label>Cidade*</label>
                <input
                  className="input mt-1"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="card">
            <ChoiceChips
              legend="Status"
              name="cliente-status"
              value={form.status}
              onChange={(status) => setForm({ ...form, status })}
              options={[
                { value: 'ativo', label: 'Ativo', icon: iconAtivo },
                { value: 'inativo', label: 'Inativo', icon: iconInativo },
              ]}
            />
          </section>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={fecharModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </Modal>
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
                    <td className="align-middle">
                      <ClienteTipoBadge tipo={c.tipo} />
                    </td>
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
