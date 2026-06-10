import React, { useState } from 'react';
import { Abastecimento } from '../types';
import { Search, Trash2, ShieldAlert, KeyRound, Eye, X, Image as ImageIcon, Fuel, User, Calendar } from 'lucide-react';

interface HistoryListProps {
  registros: Abastecimento[];
  onLimparRegistros: () => void;
  showToast: (msg: string, erro?: boolean) => void;
  senhaDesbloqueada: boolean;
  setSenhaDesbloqueada: (val: boolean) => void;
}

export default function HistoryList({
  registros,
  onLimparRegistros,
  showToast,
  senhaDesbloqueada,
  setSenhaDesbloqueada,
}: HistoryListProps) {
  const [senhaInput, setSenhaInput] = useState('');
  const [senhaErro, setSenhaErro] = useState(false);

  // Search filters
  const [searchText, setSearchText] = useState('');
  const [filterCombustivel, setFilterCombustivel] = useState<'DIESEL' | 'ARLA' | ''>('');

  // Zoom photo modal
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const SENHA_PADRAO = '1234';

  const handleValidarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (senhaInput === SENHA_PADRAO) {
      setSenhaDesbloqueada(true);
      setSenhaErro(false);
      setSenhaInput('');
      showToast('🔓 Histórico desbloqueado com sucesso!');
    } else {
      setSenhaErro(true);
      setSenhaInput('');
    }
  };

  const handleLimpar = () => {
    if (window.confirm('⚠️ Tem certeza de que deeseja apagar TODO o histórico local? Essa ação é irreversível e não afetará a nuvem do Firebase.')) {
      onLimparRegistros();
      showToast('🗑️ Todo o histórico local foi removido.');
    }
  };

  // Filtered registrations
  const filtered = registros.filter((r) => {
    const textMatch =
      r.placa.toLowerCase().includes(searchText.toLowerCase()) ||
      r.motorista.toLowerCase().includes(searchText.toLowerCase()) ||
      r.responsavel.toLowerCase().includes(searchText.toLowerCase());

    const combMatch = !filterCombustivel || r.combustivel === filterCombustivel;

    return textMatch && combMatch;
  });

  // Render Lock screen if unauthorized
  if (!senhaDesbloqueada) {
    return (
      <div className="w-full flex justify-center items-center py-12" id="history-locked-view">
        <form
          onSubmit={handleValidarSenha}
          className="w-full max-w-sm bg-gray-900 border border-gray-800 p-8 rounded-2xl text-center flex flex-col gap-5 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <KeyRound className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-sans font-extrabold text-lg text-gray-200 uppercase tracking-wide">
              Área Protegida
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Insira a senha do administrador para visualizar o histórico de abastecimentos e relatórios.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-left">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest leading-none">
              Senha de Segurança
            </label>
            <input
              type="password"
              placeholder="••••••"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 rounded-xl py-3 px-4 outline-none text-center text-xl font-bold tracking-widest text-white"
              maxLength={10}
              id="input-senha-historico"
              autoFocus
            />
          </div>

          {senhaErro && (
            <span className="text-xs font-semibold text-rose-500 flex items-center justify-center gap-1">
              <ShieldAlert className="w-4 h-4" /> Senha incorreta. Tente novamente!
            </span>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all cursor-pointer"
            id="btn-desbloquear-historico"
          >
            Liberação Administrativa
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full" id="history-unlocked-view">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-6 border-b border-gray-700/60">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-amber-500" />
          <h2 className="font-sans font-bold text-lg tracking-tight uppercase text-gray-100">
            Histórico de Abastecimentos
          </h2>
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black px-2.5 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>

        {registros.length > 0 && (
          <button
            onClick={handleLimpar}
            className="py-2 px-4 rounded-xl text-xs font-bold uppercase border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-limpar-todos-registros"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Banco Local
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="md:col-span-2 relative flex items-center">
          <input
            type="text"
            placeholder="Pesquisar placa, motorista ou frentista..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 placeholder-gray-500 rounded-xl py-2.5 pl-10 pr-4 outline-none text-sm transition-all"
            id="input-pesquisa"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 pointer-events-none" />
        </div>

        <div>
          <select
            value={filterCombustivel}
            onChange={(e) => setFilterCombustivel(e.target.value as any)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-xl py-3 px-4 outline-none focus:border-amber-500 text-sm cursor-pointer"
            id="select-filtro-combustivel"
          >
            <option value="">Combustível: Todos</option>
            <option value="DIESEL">🟡 Diesel</option>
            <option value="ARLA">🔵 Arla 32</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/10 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-800/40 flex items-center justify-center text-gray-600">
            <Fuel className="w-6 h-6" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Nenhum abastecimento encontrado para o filtro aplicado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-gray-900/30 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700 transition-all grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
              id={`card-registro-${r.id}`}
            >
              <div className="flex flex-col gap-1 md:col-span-2">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-sans font-black tracking-widest text-lg text-amber-500 uppercase">
                    🚛 {r.placa}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-800 px-2 py-0.5 rounded-md">
                    {r.horario}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${r.combustivel === 'DIESEL' ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-blue-500/5 border-blue-500/20 text-blue-400'}`}>
                    {r.combustivel === 'DIESEL' ? '🟡' : '🔵'} {r.combustivel}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/5 border border-emerald-500/20 text-emerald-400">
                    💧 {r.litragem.toLocaleString('pt-BR')} L
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#10b981]/5 border border-[#10b981]/20 text-[#10b981]">
                    📍 {r.km.toLocaleString('pt-BR')} KM
                  </span>

                  {r.horaInicio && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/5 border border-purple-500/25 text-purple-400">
                      ⏳ {r.horaInicio} ➔ {r.horaFim} ({r.duracao})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-xs text-gray-400 border-t border-gray-800/60 pt-3">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-600" />
                    <span>Motorista: <strong className="text-gray-200">{r.motorista}</strong></span>
                  </div>
                  <div>
                    <span>Frentista: <strong className="text-gray-200">{r.responsavel}</strong></span>
                  </div>
                </div>
              </div>

              {/* PHOTO CONTAINER */}
              <div className="md:col-span-2 flex justify-end">
                {r.foto ? (
                  <div className="relative group rounded-xl overflow-hidden border border-gray-800 h-24 w-40 cursor-zoom-in" onClick={() => setZoomImg(r.foto)}>
                    <img src={r.foto} alt="Foto da bomba" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 text-[11px] font-bold text-white uppercase">
                      <Eye className="w-4.5 h-4.5" /> Ampliar
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-800 h-24 w-40 flex flex-col items-center justify-center text-gray-700 bg-gray-900/10">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[10px] uppercase font-bold tracking-wider mt-1">Sem Imagem</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULLSIZE ZOOM PHOTO LIGHTBOX */}
      {zoomImg && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" id="photo-lightbox-modal">
          <div className="max-w-xl w-full flex flex-col gap-3 relative">
            <button
              onClick={() => setZoomImg(null)}
              className="absolute -top-12 right-0 bg-gray-900/60 p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all pointer-events-auto"
              id="btn-close-lightbox"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-3 overflow-hidden shadow-2xl flex justify-center">
              <img src={zoomImg} alt="Bomba Ampliada" className="max-h-[70vh] object-contain rounded-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
