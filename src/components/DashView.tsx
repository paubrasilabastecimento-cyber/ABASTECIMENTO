import React, { useMemo } from 'react';
import { Abastecimento, TanqueConfig } from '../types';
import { Calendar, TrendingUp, Users, Award, Fuel, Hourglass, Percent } from 'lucide-react';

interface DashViewProps {
  registros: Abastecimento[];
  tanqueCfg: TanqueConfig;
}

export default function DashView({ registros, tanqueCfg }: DashViewProps) {
  // Memoized calculations
  const stats = useMemo(() => {
    if (registros.length === 0) {
      return {
        totalL: 0,
        veiculosAtivos: 0,
        totalQtd: 0,
        semanalL: 0,
        mensalL: 0,
        tempoMedioMin: 0,
        maiorConsumidor: { placa: '--', total: 0 },
        tanquePct: 0,
        porVeiculo: [] as { placa: string; total: number; count: number; totalMin: number }[],
        porVeiculoTempo: [] as { placa: string; mediaMin: number }[],
        porDia: [] as { data: string; total: number }[],
      };
    }

    const agora = Date.now();
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
    const trintaDiasMs = 30 * 24 * 60 * 60 * 1000;

    let totalL = 0;
    let semanalL = 0;
    let mensalL = 0;
    let totalMin = 0;
    let registrosComTempo = 0;

    const veiculosMap: { [placa: string]: { total: number; count: number; totalMin: number } } = {};
    const diasMap: { [data: string]: number } = {};

    registros.forEach((r) => {
      totalL += r.litragem;

      // Weekly / Monthly total
      const diff = agora - r.timestamp;
      if (diff <= seteDiasMs) {
        semanalL += r.litragem;
      }
      if (diff <= trintaDiasMs) {
        mensalL += r.litragem;
      }

      // Fueling duration
      if (r.duracaoMin && r.duracaoMin > 0) {
        totalMin += r.duracaoMin;
        registrosComTempo++;
      }

      // Group by vehicle
      if (!veiculosMap[r.placa]) {
        veiculosMap[r.placa] = { total: 0, count: 0, totalMin: 0 };
      }
      veiculosMap[r.placa].total += r.litragem;
      veiculosMap[r.placa].count += 1;
      if (r.duracaoMin && r.duracaoMin > 0) {
        veiculosMap[r.placa].totalMin += r.duracaoMin;
      }

      // Group by day for timeline chart (limit to last 15 days of entries)
      const dataStr = r.data;
      diasMap[dataStr] = (diasMap[dataStr] || 0) + r.litragem;
    });

    const veiculosAtivos = Object.keys(veiculosMap).length;
    const tempoMedioMin = registrosComTempo > 0 ? totalMin / registrosComTempo : 0;

    // Convert veiculos map to sorted list
    const porVeiculo = Object.keys(veiculosMap).map((placa) => ({
      placa,
      total: veiculosMap[placa].total,
      count: veiculosMap[placa].count,
      totalMin: veiculosMap[placa].totalMin,
    })).sort((a, b) => b.total - a.total);

    // Calc highest consumer
    const maiorConsumidor = porVeiculo.length > 0 ? { placa: porVeiculo[0].placa, total: porVeiculo[0].total } : { placa: '--', total: 0 };

    // Group by vehicle duration average
    const porVeiculoTempo = Object.keys(veiculosMap)
      .map((placa) => {
        const v = veiculosMap[placa];
        return {
          placa,
          mediaMin: v.count > 0 ? v.totalMin / v.count : 0,
        };
      })
      .filter((v) => v.mediaMin > 0)
      .sort((a, b) => b.mediaMin - a.mediaMin);

    // Group days for timeline
    const porDia = Object.keys(diasMap)
      .map((data) => ({
        data,
        total: diasMap[data],
      }))
      // Sort chronologically (day/month/year parsing)
      .sort((a, b) => {
        const parse = (dStr: string) => {
          const [d, m, y] = dStr.split('/').map(Number);
          return new Date(y, m - 1, d).getTime();
        };
        return parse(a.data) - parse(b.data);
      })
      .slice(-10); // Take last 10 dates for a cleaner view

    const tanquePct = tanqueCfg.capacidade > 0 ? Math.min(100, Math.round((tanqueCfg.atual / tanqueCfg.capacidade) * 100)) : 0;

    return {
      totalL,
      veiculosAtivos,
      totalQtd: registros.length,
      semanalL,
      mensalL,
      tempoMedioMin,
      maiorConsumidor,
      tanquePct,
      porVeiculo,
      porVeiculoTempo,
      porDia,
    };
  }, [registros, tanqueCfg]);

  return (
    <div className="w-full" id="dashboard-view">
      <div className="flex items-center gap-3 pb-3 mb-6 border-b border-gray-700/60 font-sans">
        <TrendingUp className="w-6 h-6 text-amber-500" />
        <h2 className="font-bold text-lg tracking-tight uppercase text-gray-100">
          Dashboard de Frota
        </h2>
      </div>

      {registros.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/10 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3">
          <Fuel className="w-8 h-8 text-gray-600 animate-pulse" />
          <p className="text-sm text-gray-500 font-medium">Cadastre abastecimentos para visualizar as métricas de frota.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bento KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/80 flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Volume Abastecido</span>
              <span className="text-2xl font-black text-amber-500 font-mono tracking-tight">{stats.totalL.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</span>
              <span className="text-[10px] text-gray-500 mt-auto font-medium">Acumulado histórico</span>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/80 flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Média Semanal</span>
              <span className="text-2xl font-black text-blue-400 font-mono tracking-tight">{stats.semanalL.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</span>
              <span className="text-[10px] text-gray-500 mt-auto font-medium">Últimos 7 dias</span>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/80 flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-[#10b981] uppercase tracking-wider">Média Mensal</span>
              <span className="text-2xl font-black text-[#10b981] font-mono tracking-tight">{stats.mensalL.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</span>
              <span className="text-[10px] text-gray-500 mt-auto font-medium">Últimos 30 dias</span>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/80 flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider">Tempo Médio Abast.</span>
              <span className="text-2xl font-black text-purple-400 font-mono tracking-tight">
                {stats.tempoMedioMin > 0 ? (
                  stats.tempoMedioMin >= 60 ? (
                    `${Math.floor(stats.tempoMedioMin / 60)}h ${Math.round(stats.tempoMedioMin % 60)}m`
                  ) : `${Math.round(stats.tempoMedioMin)} min`
                ) : '--'}
              </span>
              <span className="text-[10px] text-gray-500 mt-auto font-medium">Por operação</span>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/80 flex flex-col gap-2 col-span-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" /> Maior Consumo (Placa)
              </span>
              <span className="text-xl font-black text-gray-200 tracking-wider">🚛 {stats.maiorConsumidor.placa}</span>
              <span className="text-[10px] text-gray-500 font-medium">Total de {stats.maiorConsumidor.total.toLocaleString('pt-BR')} litros</span>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/80 flex flex-col gap-2 col-span-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-cyan-500" /> Reserva Diesel Tanque
              </span>
              <div className="flex items-center gap-3">
                <span className={`text-xl font-black font-mono ${stats.tanquePct <= 20 ? 'text-rose-500 animate-pulse' : stats.tanquePct <= 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {stats.tanquePct}%
                </span>
                <div className="flex-1 bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700/50">
                  <div
                    className={`h-full rounded-full transition-all ${stats.tanquePct <= 20 ? 'bg-rose-500' : stats.tanquePct <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${stats.tanquePct}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{tanqueCfg.atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L disponíveis de {tanqueCfg.capacidade.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L</span>
            </div>
          </div>

          {/* Rankings / KPI Bars Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* RANKING CONSUMO */}
            <div className="bg-gray-900/30 border border-gray-800/80 p-5 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                <span>🏆</span> Consumo Total por Placa (Top 5)
              </h3>
              <div className="space-y-3">
                {stats.porVeiculo.slice(0, 5).map((v, i) => {
                  const maxVal = stats.porVeiculo[0]?.total || 1;
                  const pct = Math.round((v.total / maxVal) * 100);
                  const medals = ['🥇', '🥈', '🥉', '🔹', '🔹'];
                  return (
                    <div key={v.placa} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-300">
                          {medals[i]} <strong className="font-mono text-amber-500 font-semibold tracking-wider">{v.placa}</strong>
                        </span>
                        <span className="text-gray-400 font-bold font-mono">{v.total.toLocaleString('pt-BR')} L</span>
                      </div>
                      <div className="w-full bg-gray-800/60 h-2 rounded-full overflow-hidden border border-gray-700/10">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RANKING TEMPO */}
            <div className="bg-gray-900/30 border border-gray-800/80 p-5 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                <span>⏱</span> Tempo Médio por Abastecimento (Top 5)
              </h3>
              <div className="space-y-3">
                {stats.porVeiculoTempo.slice(0, 5).map((v, i) => {
                  const maxVal = stats.porVeiculoTempo[0]?.mediaMin || 1;
                  const pct = Math.round((v.mediaMin / maxVal) * 100);
                  const medals = ['🥇', '🥈', '🥉', '🔹', '🔹'];
                  return (
                    <div key={v.placa} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-300">
                          {medals[i]} <strong className="font-mono text-purple-400 font-semibold tracking-wider">{v.placa}</strong>
                        </span>
                        <span className="text-gray-400 font-bold font-mono">{Math.round(v.mediaMin)} min/op</span>
                      </div>
                      <div className="w-full bg-gray-800/60 h-2 rounded-full overflow-hidden border border-gray-700/10">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SVG TIMELINE CHART & SVG VEHICLE CONSUMPTION */}
          <div className="grid grid-cols-1 gap-5">
            {/* SVG EVOLUCAO TEMPORAL */}
            <div className="bg-gray-900/30 border border-gray-800/80 p-5 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                <span>📈</span> Evolução Temporal de Abastecimento (Últimos Dias)
              </h3>

              {stats.porDia.length < 2 ? (
                <div className="py-12 text-center text-xs text-gray-500">Dados temporais insuficientes para desenhar gráfico. Continue registrando.</div>
              ) : (
                <div className="h-64 w-full" id="timeline-svg-chart">
                  <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="580" y2="20" stroke="#2e3350" strokeWidth="0.5" strokeDasharray="3,3" />
                    <line x1="40" y1="70" x2="580" y2="70" stroke="#2e3350" strokeWidth="0.5" strokeDasharray="3,3" />
                    <line x1="40" y1="120" x2="580" y2="120" stroke="#2e3350" strokeWidth="0.5" strokeDasharray="3,3" />
                    <line x1="40" y1="170" x2="580" y2="170" stroke="#2e3350" strokeWidth="0.5" strokeDasharray="3,3" />
                    <line x1="40" y1="210" x2="580" y2="210" stroke="#2e3350" strokeWidth="1" />

                    {/* Coordinates computation */}
                    {(() => {
                      const maxVal = Math.max(...stats.porDia.map((d) => d.total)) * 1.15 || 100;
                      const points = stats.porDia.map((d, index) => {
                        const x = 50 + (index * (530 / (stats.porDia.length - 1)));
                        const y = 210 - ((d.total / maxVal) * 180);
                        return { x, y, value: d.total, date: d.data };
                      });

                      const pathStr = points.reduce((acc, p, index) => {
                        return acc + `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
                      }, '');

                      // Translucent fill path str
                      const fillPathStr = pathStr + `L ${points[points.length - 1].x} 210 L ${points[0].x} 210 Z`;

                      return (
                        <>
                          {/* Translucent Area */}
                          <path d={fillPathStr} fill="url(#glowGrad)" />

                          {/* Line */}
                          <path d={pathStr} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Nodes & Labels */}
                          {points.map((p, index) => (
                            <g key={index} className="group">
                              <circle cx={p.x} cy={p.y} r="5" fill="#f59e0b" stroke="#111525" strokeWidth="2" />
                              <text x={p.x} y="228" fill="#6b7280" fontSize="9" textAnchor="middle" fontWeight="bold">
                                {p.date.split('/').slice(0, 2).join('/')}
                              </text>
                              {/* Hover tooltip text */}
                              <text x={p.x} y={p.y - 12} fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold" className="opacity-80">
                                {Math.round(p.value)} L
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
