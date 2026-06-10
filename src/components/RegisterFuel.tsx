import React, { useState, useEffect } from 'react';
import { Abastecimento, TanqueConfig } from '../types';
import { compressImage } from '../utils';
import { Play, Square, Clock, Truck, Milestone, Fuel, User, UserCheck, Camera, CheckCircle2 } from 'lucide-react';

interface RegisterFuelProps {
  onAddRegistro: (registro: Abastecimento) => void;
  tanqueCfg: TanqueConfig;
  setTanqueCfg: React.Dispatch<React.SetStateAction<TanqueConfig>>;
  showToast: (msg: string, erro?: boolean) => void;
}

export default function RegisterFuel({ onAddRegistro, tanqueCfg, setTanqueCfg, showToast }: RegisterFuelProps) {
  const [placa, setPlaca] = useState('');
  const [placaOutro, setPlacaOutro] = useState('');
  const [km, setKm] = useState('');
  const [litragem, setLitragem] = useState('');
  const [combustivel, setCombustivel] = useState<'DIESEL' | 'ARLA' | ''>('');
  const [motorista, setMotorista] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // Times
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [horaFim, setHoraFim] = useState<Date | null>(null);
  const [duracaoTxt, setDuracaoTxt] = useState('--');

  // Foto states
  const [fotoBase64, setFotoBase64] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const placasPredefinidas = [
    'QSK7D92', 'OXO0532', 'OXO0542', 'OXO0552', 'OXO0782', 'SLB4A26',
    'NPR2601', 'SLB4A56', 'TOZ8B20', 'TOZ8B50', 'RLR8G79', 'RLU4H49',
    'TOU7F79', 'RLW0C17', 'SLB3J76', 'RLU3F59', 'RLT5J54', 'RLT5J44'
  ];

  // Calculate duration when start or end change
  useEffect(() => {
    if (!horaInicio || !horaFim) {
      setDuracaoTxt('--');
      return;
    }
    const ms = horaFim.getTime() - horaInicio.getTime();
    if (ms < 0) {
      setDuracaoTxt('Inválido');
      return;
    }
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const s = Math.floor((ms % 60000) / 1000);

    if (h > 0) {
      setDuracaoTxt(`${h}h ${m}m`);
    } else {
      setDuracaoTxt(`${mins}m ${s}s`);
    }
  }, [horaInicio, horaFim]);

  const marcarHora = (tipo: 'inicio' | 'fim') => {
    const agora = new Date();
    if (tipo === 'inicio') {
      setHoraInicio(agora);
      showToast('🟢 Horário de início marcado!');
    } else {
      if (!horaInicio) {
        showToast('⚠️ Marque o início primeiro!', true);
        return;
      }
      setHoraFim(agora);
      showToast('🔴 Horário de término marcado!');
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setIsCompressing(true);
      try {
        // Compress using Canvas down to 600px max, quality 0.6
        const compressedBase64 = await compressImage(files[0], 600, 600, 0.6);
        setFotoBase64(compressedBase64);
        showToast('📸 Foto capturada e comprimida com sucesso!');
      } catch (err) {
        console.error(err);
        showToast('⚠️ Erro ao processar foto', true);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const resetForm = () => {
    setPlaca('');
    setPlacaOutro('');
    setKm('');
    setLitragem('');
    setCombustivel('');
    setMotorista('');
    setResponsavel('');
    setHoraInicio(null);
    setHoraFim(null);
    setFotoBase64('');
    setDuracaoTxt('--');
    // Clear input element
    const fileElem = document.getElementById('foto-bomba-input') as HTMLInputElement;
    if (fileElem) fileElem.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalPlaca = placa === 'outro' ? placaOutro.trim().toUpperCase() : placa;
    const finalKm = parseFloat(km);
    const finalLitragem = parseFloat(litragem);

    if (!finalPlaca) {
      showToast('⚠️ Preencha a placa do veículo', true);
      return;
    }
    if (!km || isNaN(finalKm)) {
      showToast('⚠️ Preencha o KM do veículo', true);
      return;
    }
    if (!combustivel) {
      showToast('⚠️ Escolha o tipo de combustível', true);
      return;
    }
    if (!litragem || isNaN(finalLitragem)) {
      showToast('⚠️ Preencha a litragem abastecida', true);
      return;
    }
    if (!motorista.trim()) {
      showToast('⚠️ Preencha o nome do motorista', true);
      return;
    }
    if (!responsavel.trim()) {
      showToast('⚠️ Preencha o responsável pelo abastecimento', true);
      return;
    }
    if (!horaInicio || !horaFim) {
      showToast('⚠️ Marque os horários de início e fim da operação!', true);
      return;
    }

    const ms = horaFim.getTime() - horaInicio.getTime();
    const duracaoMin = Math.round(ms / 60000);

    const hIStr = horaInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const hFStr = horaFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const agora = new Date();
    const novoReg: Abastecimento = {
      id: Date.now(),
      placa: finalPlaca,
      km: finalKm,
      litragem: finalLitragem,
      combustivel,
      motorista: motorista.trim(),
      responsavel: responsavel.trim(),
      horaInicio: hIStr,
      horaFim: hFStr,
      duracao: duracaoTxt,
      duracaoMin,
      foto: fotoBase64,
      horario: agora.toLocaleString('pt-BR'),
      data: agora.toLocaleDateString('pt-BR'),
      timestamp: agora.getTime()
    };

    // Subtrack from diesel tank if DIESEL is chosen
    if (combustivel === 'DIESEL') {
      const novoVolume = Math.max(0, tanqueCfg.atual - finalLitragem);
      const novoConfig = { ...tanqueCfg, atual: novoVolume };
      setTanqueCfg(novoConfig);
      localStorage.setItem('tanqueCfg', JSON.stringify(novoConfig));
    }

    onAddRegistro(novoReg);
    resetForm();
    showToast('✅ Abastecimento registrado com sucesso!');
  };

  return (
    <div id="page-form" className="w-full">
      <div className="flex items-center gap-3 pb-3 mb-6 border-b border-gray-700/60">
        <Fuel className="w-6 h-6 text-amber-500" />
        <h2 className="font-sans font-bold text-lg tracking-tight uppercase text-gray-100">
          Novo Abastecimento
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-900/40 p-5 rounded-2xl border border-gray-800/80">
        {/* TIMER CONTAINER */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            Horário da Operação <span className="text-amber-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border transition-all flex flex-col gap-2 ${horaInicio ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-gray-800/40 border-gray-700/60'}`}>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">🟢 Início</span>
              <span className={`text-2xl font-bold font-mono tracking-wider ${horaInicio ? 'text-emerald-400' : 'text-gray-600'}`}>
                {horaInicio ? horaInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
              <button
                type="button"
                onClick={() => marcarHora('inicio')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase flex items-center justify-center gap-1.5 transition-all text-white ${horaInicio ? 'bg-emerald-600/30 border border-emerald-500/40' : 'bg-gray-800 hover:bg-gray-700 border border-transparent'}`}
                id="btn-marcar-inicio"
              >
                {horaInicio ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                {horaInicio ? 'Iniciado' : 'Marcar Início'}
              </button>
            </div>

            <div className={`p-4 rounded-xl border transition-all flex flex-col gap-2 ${horaFim ? 'bg-rose-950/20 border-rose-500/40' : 'bg-gray-800/40 border-gray-700/60'}`}>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">🔴 Fim</span>
              <span className={`text-2xl font-bold font-mono tracking-wider ${horaFim ? 'text-rose-400' : 'text-gray-600'}`}>
                {horaFim ? horaFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
              <button
                type="button"
                onClick={() => marcarHora('fim')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase flex items-center justify-center gap-1.5 transition-all text-white ${horaFim ? 'bg-rose-600/30 border border-rose-500/40' : 'bg-gray-800 hover:bg-gray-700 border border-transparent'}`}
                id="btn-marcar-fim"
              >
                {horaFim ? <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> : <Square className="w-3.5 h-3.5 text-rose-500" />}
                {horaFim ? 'Concluído' : 'Marcar Fim'}
              </button>
            </div>
          </div>

          {horaInicio && horaFim && (
            <div className="mt-2 p-3 bg-emerald-50/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase">Duração Total</span>
              <span className="text-lg font-bold font-mono text-emerald-400">{duracaoTxt}</span>
            </div>
          )}
        </div>

        {/* PLACA */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-500" />
            Placa do Veículo <span className="text-amber-500">*</span>
          </label>
          <div className="relative">
            <select
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl py-3 px-4 outline-none focus:border-amber-500 appearance-none font-medium leading-tight cursor-pointer"
              id="select-placa-combustivel"
            >
              <option value="">Selecione ou adicione</option>
              {placasPredefinidas.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="outro">Outra placa...</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          {placa === 'outro' && (
            <input
              type="text"
              value={placaOutro}
              onChange={(e) => setPlacaOutro(e.target.value)}
              placeholder="Digite a placa (ex: ABC1D23)"
              maxLength={8}
              className="mt-2 w-full bg-gray-800 border-2 border-amber-500/40 text-gray-100 font-bold tracking-wider placeholder-gray-500 rounded-xl py-3 px-4 outline-none focus:border-amber-500"
              id="input-placa-outra"
            />
          )}
        </div>

        {/* KM */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
            <Milestone className="w-4 h-4 text-[#10b981]" />
            KM do Veículo <span className="text-amber-500">*</span>
          </label>
          <input
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="Ex: 125430"
            min="0"
            className="w-full bg-gray-800 border border-gray-700 focus:border-[#10b981] text-gray-100 rounded-xl py-3 px-4 outline-none transition-all font-mono"
            id="input-km"
          />
        </div>

        {/* COMBUSTIVEL */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400">
            Combustível <span className="text-amber-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCombustivel('DIESEL')}
              className={`py-3 px-4 rounded-xl font-bold transition-all border text-sm flex items-center justify-center gap-2 ${combustivel === 'DIESEL' ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-extrabold shadow-lg shadow-amber-500/5' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}
              id="btn-selecionar-diesel"
            >
              <span className="text-base">🟡</span> Diesel
            </button>
            <button
              type="button"
              onClick={() => setCombustivel('ARLA')}
              className={`py-3 px-4 rounded-xl font-bold transition-all border text-sm flex items-center justify-center gap-2 ${combustivel === 'ARLA' ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-extrabold shadow-lg shadow-blue-500/5' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}
              id="btn-selecionar-arla"
            >
              <span className="text-base">🔵</span> Arla 32
            </button>
          </div>
        </div>

        {/* LITRAGEM */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-indigo-400" />
            Litragem (L) <span className="text-amber-500">*</span>
          </label>
          <input
            type="number"
            step="0.1"
            value={litragem}
            onChange={(e) => setLitragem(e.target.value)}
            placeholder="Ex: 120.5"
            min="0"
            className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 text-gray-100 rounded-xl py-3 px-4 outline-none transition-all font-mono"
            id="input-litros"
          />
        </div>

        {/* MOTORISTA */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
            <User className="w-4 h-4 text-purple-400" />
            Motorista <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            value={motorista}
            onChange={(e) => setMotorista(e.target.value)}
            placeholder="Nome completo do motorista"
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-gray-100 rounded-xl py-3 px-4 outline-none transition-all"
            id="input-motorista"
          />
        </div>

        {/* RESPONSAVEL */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-pink-400" />
            Responsável pelo Abastecimento <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do frentista ou encarregado"
            className="w-full bg-gray-800 border border-gray-700 focus:border-pink-500 text-gray-100 rounded-xl py-3 px-4 outline-none transition-all"
            id="input-responsavel"
          />
        </div>

        {/* CAPTURA FOTO */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-cyan-400" />
            Foto da Bomba
          </label>
          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="foto-bomba-input"
              onChange={handleFotoChange}
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:uppercase file:bg-amber-500 file:text-black hover:file:bg-amber-600 cursor-pointer"
            />
            
            {isCompressing && (
              <span className="text-xs font-medium text-amber-500 animate-pulse">
                Comprimindo imagem para preservar memória...
              </span>
            )}

            {fotoBase64 && (
              <div className="mt-2 border border-gray-800 rounded-2xl overflow-hidden max-h-48 flex justify-center bg-black/40 relative">
                <img src={fotoBase64} alt="Foto da bomba" className="max-h-48 object-contain" />
                <button
                  type="button"
                  onClick={() => setFotoBase64('')}
                  className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition-all"
                  id="btn-remover-foto"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black border-2 border-amber-600 shadow-xl shadow-amber-500/5 active:scale-95 transition-all text-sm font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            id="btn-registrar-abastecimento"
          >
            Registrar Abastecimento
          </button>
        </div>
      </form>
    </div>
  );
}
