import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL } from '@/lib/format';
import type {
  DashboardClientePacote,
  DashboardGranularidade,
  DashboardMix,
  DashboardRankingPeca,
  DashboardReceitaTipo,
  DashboardVolume,
} from '@/types';

const gridStroke = '#e2e8f0';
const tickFill = '#64748b';
const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgb(226 232 240)',
  boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.12)',
  fontSize: 13,
};

const PIE_COLORS = ['#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#64748b', '#f43f5e'];

function formatPeriodoShort(periodo: string, gr: DashboardGranularidade): string {
  if (!periodo || !/^\d{4}-\d{2}-\d{2}/.test(periodo)) return periodo;
  const [y, m, d] = periodo.slice(0, 10).split('-').map(Number);
  if (gr === 'mes') {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(
      new Date(Date.UTC(y, m - 1, 1)),
    );
  }
  if (gr === 'semana') {
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  }
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

type VolumeChartProps = {
  volume: DashboardVolume[];
  granularidade: DashboardGranularidade;
};

export function DashboardVolumeChart({ volume, granularidade }: VolumeChartProps) {
  const chartData = useMemo(
    () =>
      volume.map((v) => ({
        label: formatPeriodoShort(v.periodo, granularidade),
        pecas: v.pecas,
        comandas: v.comandas,
      })),
    [volume, granularidade],
  );

  if (!chartData.length) return null;

  return (
    <div className="w-full">
      <div className="h-[min(22rem,50vh)] w-full min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
            <defs>
              <linearGradient id="gestaoVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: tickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
              interval={chartData.length > 14 ? 'preserveStartEnd' : 0}
              angle={chartData.length > 10 ? -35 : 0}
              textAnchor={chartData.length > 10 ? 'end' : 'middle'}
              height={chartData.length > 10 ? 56 : 32}
            />
            <YAxis
              tick={{ fill: tickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [
                name === 'pecas' ? `${value} peças` : `${value} comandas`,
                name === 'pecas' ? 'Peças' : 'Comandas',
              ]}
              labelFormatter={(label) => `Período: ${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => (value === 'pecas' ? 'Peças' : 'Comandas')}
            />
            <Bar dataKey="pecas" name="pecas" fill="url(#gestaoVolumeGrad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
            <Bar dataKey="comandas" name="comandas" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type MixChartProps = {
  mix: DashboardMix[];
  tipoLabel: Record<string, string>;
};

export function DashboardMixPieChart({ mix, tipoLabel }: MixChartProps) {
  const chartData = useMemo(
    () =>
      mix.map((m) => ({
        name: tipoLabel[m.tipo] ?? m.tipo,
        valor: m.valor,
        pecas: m.pecas,
      })),
    [mix, tipoLabel],
  );

  if (!chartData.length) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="relative mx-auto w-full max-w-md overflow-visible px-2 sm:px-4">
        <div className="aspect-square w-full min-h-[240px] max-h-[min(55vw,22rem)] sm:min-h-[280px] sm:max-h-[24rem]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={chartData}
                dataKey="valor"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="46%"
                outerRadius="70%"
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, _n, props) => [
                  `${formatBRL(value)} · ${props.payload.pecas} peças`,
                  'Valor nas linhas',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ul className="grid w-full gap-2 text-sm sm:grid-cols-2">
        {chartData.map((row, i) => (
          <li
            key={row.name}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-200/60"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="truncate font-medium text-slate-800">{row.name}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-700">{formatBRL(row.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ReceitaChartProps = {
  rows: DashboardReceitaTipo[];
  tipoLabel: Record<string, string>;
};

export function DashboardReceitaTipoChart({ rows, tipoLabel }: ReceitaChartProps) {
  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        name: tipoLabel[r.tipo] ?? r.tipo,
        valor: r.valor,
        comandas: r.comandas,
      })),
    [rows, tipoLabel],
  );

  if (!chartData.length) return null;

  return (
    <div className="h-56 w-full min-h-[200px] sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="gestaoReceitaGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={{ fill: tickFill, fontSize: 11 }} tickFormatter={(v) => formatBRL(v)} />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: tickFill, fontSize: 12, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, _k, item) => [
              `${formatBRL(value)} · ${item.payload.comandas} comandas`,
              'Receita',
            ]}
          />
          <Bar dataKey="valor" fill="url(#gestaoReceitaGrad)" radius={[0, 8, 8, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type RankingChartProps = {
  ranking: DashboardRankingPeca[];
};

export function DashboardRankingChart({ ranking }: RankingChartProps) {
  const chartData = useMemo(
    () =>
      ranking.map((p) => ({
        name: p.nome.length > 28 ? `${p.nome.slice(0, 26)}…` : p.nome,
        fullName: p.nome,
        quantidade: p.quantidade,
      })),
    [ranking],
  );

  if (!chartData.length) return null;

  return (
    <div className="h-[min(24rem,55vh)] w-full min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="gestaoRankGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#0284c7" stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={{ fill: tickFill, fontSize: 11 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={118}
            reversed
            tick={{ fill: tickFill, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, _k, item) => [`${value} un.`, item.payload.fullName as string]}
          />
          <Bar dataKey="quantidade" fill="url(#gestaoRankGrad)" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type PacotesChartProps = {
  rows: DashboardClientePacote[];
};

export function DashboardPacotesChart({ rows }: PacotesChartProps) {
  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => a.clientes - b.clientes)
        .map((r) => ({
          name: r.nome_pacote.length > 26 ? `${r.nome_pacote.slice(0, 24)}…` : r.nome_pacote,
          fullName: r.nome_pacote,
          clientes: r.clientes,
        })),
    [rows],
  );

  if (!chartData.length) return null;

  return (
    <div className="h-64 w-full min-h-[220px] sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="gestaoPacoteGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={{ fill: tickFill, fontSize: 11 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tick={{ fill: tickFill, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, _k, item) => [`${value} clientes`, item.payload.fullName as string]}
          />
          <Bar dataKey="clientes" fill="url(#gestaoPacoteGrad)" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
