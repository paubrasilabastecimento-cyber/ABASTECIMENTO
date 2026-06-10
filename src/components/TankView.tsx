import React from 'react';
import { Abastecimento, TanqueConfig } from '../types';
import { Fuel, ShieldAlert, Sliders, History } from 'lucide-react';

interface TankViewProps {
  registros: Abastecimento[];
  tanqueCfg: TanqueConfig;
  setTanqueCfg: React.Dispatch<React.SetStateAction<TanqueConfig>>;
  showToast: (msg: string, erro?: boolean) => void;
}

export default function TankView({ registros, tanqueCfg, setTanqueCfg, showToast }: TankViewProps) {
  const handleCapacidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    const novoConfig = { ...tanqueCfg, capacidade: val };
    setTanqueCfg(novoConfig);
    localStorage.setItem('tanqueCfg', JSON.stringify(novoConfig));
  };

  const handleAtualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    const bounded = Math.min(val, tanqueCfg.capacidade);
    const novoConfig = { ...tanqueCfg, atual: bounded };
    setTanqueCfg(novoConfig);
    localStorage.setItem('tanqueCfg', JSON.stringify(novoConfig));
  };

  const pct = tanqueCfg.capacidade > 0 ? Math.min(100, Math.round((tanqueCfg.atual / tanqueCfg.capacidade) * 100)) : 0;

  // Filter diesel draws
  const dieselDraws = registros.filter((r) => r.combustivel === 'DIESEL');

  // Liquid color
  const liquidColor = pct <= 20 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#10b981';
  const glowColor = pct <= 20 ? 'rgba(239, 68, 68, 0.4)' : pct <= 50 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';

  return (
    <div className="w-full" id="tanque-view">
      <div className="flex items-center gap-3 pb-3 mb-6 border-b border-gray-700/60">
        <Fuel className="w-6 h-6 text-amber-500" />
        <h2 className="font-sans font-bold text-lg tracking-tight uppercase text-gray-100">
          Controle do Tanque de Diesel
        </h2>
      </div>

      {/* CRITICAL LOW ALERTS */}
      {pct <= 20 && tanqueCfg.capacidade > 0 && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 animate-pulse" id="alert-tanque-critico">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Combustível Nível Crítico!</h4>
            <p className="text-xs text-gray-400 mt-1">
              O estoque restante é de apenas <strong>{pct}% ({Math.round(tanqueCfg.atual).toLocaleString('pt-BR')} L)</strong>.
              Recomenda-se providenciar reabastecimento imediato do reservatório fixo.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* CONFIG LABELS */}
        <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800/80 flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-800/85 pb-2">
            <Sliders className="w-4 h-4 text-amber-500" /> Configurar Reservatório
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Capacidade (L)</label>
              <input
                type="number"
                value={tanqueCfg.capacidade || ''}
                onChange={handleCapacidadeChange}
                placeholder="Ex: 15000"
                className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 rounded-xl py-2 px-3 outline-none text-sm transition-all"
                id="input-capacidade-tanque"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Volume Atual (L)</label>
              <input
                type="number"
                value={tanqueCfg.atual || ''}
                onChange={handleAtualChange}
                placeholder="Ex: 8000"
                className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 rounded-xl py-2 px-3 outline-none text-sm transition-all"
                id="input-estoque-tanque"
              />
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            💡 O estoque do tanque de Diesel é **descontado automaticamente** em tempo real à medida que novos fueling de Diesel são registrados pelos auxiliares no painel operacional.
          </p>
        </div>

        {/* BULLETPROOF LIQUID GRAPHIC CAPSULE */}
        <div className="bg-gray-900/30 border border-gray-800/80 p-6 rounded-2xl flex flex-col items-center">
          <div className="relative w-40 h-72 flex justify-center items-center">
            {/* SVG CAPSULE */}
            <svg className="w-28 h-64" viewBox="0 0 100 200">
              <defs>
                {/* Gloss highlights */}
                <linearGradient id="glassGloss" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
                  <stop offset="30%" stopColor="#ffffff" stopOpacity="0.03" />
                  <stop offset="80%" stopColor="#000000" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
                </linearGradient>
                {/* Liquid glow gradient */}
                <linearGradient id="liqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={liquidColor} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={liquidColor} stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Glass Tank Shell Outline */}
              <rect x="5" y="5" width="90" height="190" rx="15" ry="15" fill="#1b1e2a" stroke="#4a5073" strokeWidth="3" />

              {/* Liquid Level Shape */}
              {(() => {
                const fillHeight = (pct / 100) * 180;
                const fillY = 191 - fillHeight;
                if (pct <= 0) return null;
                return (
                  <rect
                    x="8"
                    y={fillY}
                    width="84"
                    height={fillHeight}
                    rx="6"
                    ry="6"
                    fill="url(#liqGrad)"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0px -4px 10px ${glowColor})` }}
                  />
                );
              })()}

              {/* Glass Shade Layer */}
              <rect x="5" y="5" width="90" height="190" rx="15" ry="15" fill="url(#glassGloss)" pointerEvents="none" />

              {/* Gauge markers */}
              <line x1="10" y1="52.5" x2="22" y2="52.5" stroke="#4a5073" strokeWidth="1.5" />  {/* 75% */}
              <line x1="10" y1="100" x2="26" y2="100" stroke="#4a5073" strokeWidth="1.5" />   {/* 50% */}
              <line x1="10" y1="147.5" x2="22" y2="147.5" stroke="#4a5073" strokeWidth="1.5" />  {/* 25% */}
            </svg>

            {/* Labels overlay */}
            <div className="absolute inset-y-0 right-0 flex flex-col justify-between py-12 pr-4 text-[10px] font-bold text-gray-400 leading-none pointer-events-none uppercase">
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
            </div>

            {/* Float percent tag */}
            <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
              <span className="text-3xl font-black text-white font-mono drop-shadow-md tracking-tight">
                {pct}%
              </span>
              <span className="text-[10px] text-gray-200 mt-1 font-bold bg-black/60 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                Nível
              </span>
            </div>
          </div>

          <div className="text-center mt-3 font-sans">
            <h4 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">Estoque Reservado</h4>
            <span className="text-sm text-gray-500 font-bold block mt-1">
              {tanqueCfg.capacidade > 0 ? (
                `${Math.round(tanqueCfg.atual).toLocaleString('pt-BR')}L / ${Math.round(tanqueCfg.capacidade).toLocaleString('pt-BR')}L`
              ) : 'Não configurado'}
            </span>
          </div>
        </div>
      </div>

      {/* WITHDRAWALS LIST */}
      <div className="mt-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
          <History className="w-4 h-4 text-purple-400" /> Histórico de Saídas (Últimos Saques de Diesel)
        </h3>

        {dieselDraws.length === 0 ? (
          <div className="text-center py-10 bg-gray-900/10 border border-dashed border-gray-800 rounded-2xl text-xs text-gray-500 font-medium">
            Nenhuma retirada de Diesel registrada até o momento.
          </div>
        ) : (
          <div className="bg-gray-900/30 border border-gray-800/80 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
            {dieselDraws.slice(0, 10).map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between text-xs hover:bg-gray-900/10 transition-all font-sans">
                <div className="flex flex-col gap-1">
                  <span className="font-extrabold text-amber-500 tracking-widest text-[13px] uppercase">
                    🚛 {r.placa}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Motorista: {r.motorista} | {r.data} {r.horaInicio}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-rose-500 text-sm font-mono">
                    -{r.litragem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
