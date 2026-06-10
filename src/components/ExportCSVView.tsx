import React, { useState, useMemo } from 'react';
import { Abastecimento } from '../types';
import { FileDown, Calendar, Eye, HelpCircle } from 'lucide-react';

interface ExportCSVViewProps {
  registros: Abastecimento[];
  showToast: (msg: string, erro?: boolean) => void;
}

export default function ExportCSVView({ registros, showToast }: ExportCSVViewProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroPlaca, setFiltroPlaca] = useState('');
  const [filtroCombustivel, setFiltroCombustivel] = useState('');

  // Semicolon-separated CSV compilation state
  const [csvContent, setCsvContent] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreview, setCsvPreview] = useState<string[]>([]);

  // Unique plaques in local history for filters dropdown
  const uniquePlacas = useMemo(() => {
    const list = registros.map((r) => r.placa);
    return [...new Set(list)].sort();
  }, [registros]);

  // Mask function for "DD/MM/AAAA" date entry
  const handleDateMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    if (val.length > 5) {
      val = val.slice(0, 5) + '/' + val.slice(5, 9);
    }
    setter(val);
  };

  const getFilteredData = (): Abastecimento[] => {
    const parseDateStr = (sStr: string): Date | null => {
      if (!sStr || sStr.length < 10) return null;
      const [d, m, y] = sStr.split('/').map(Number);
      return new Date(y, m - 1, d);
    };

    const dIni = parseDateStr(dataInicio);
    const dFim = parseDateStr(dataFim);
    if (dFim) {
      dFim.setHours(23, 59, 59, 999);
    }

    return registros.filter((r) => {
      const rDate = new Date(r.timestamp);
      if (dIni && rDate < dIni) return false;
      if (dFim && rDate > dFim) return false;
      if (filtroPlaca && r.placa !== filtroPlaca) return false;
      if (filtroCombustivel && r.combustivel !== filtroCombustivel) return false;
      return true;
    });
  };

  const escapeCSVCellValue = (val: any): string => {
    const s = String(val ?? '');
    if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes(',')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const buildRow = (cells: any[]): string => {
    return cells.map(escapeCSVCellValue).join(';');
  };

  const compileCSV = (tipo: 'completo' | 'resumo' | 'diario' | 'motoristas' | 'tempos') => {
    const dataSet = getFilteredData();
    if (dataSet.length === 0) {
      showToast('⚠️ Nenhum registro correspondente aos filtros estabelecidos.', true);
      return;
    }

    const rows: string[] = [];
    let titleStr = '';

    if (tipo === 'completo') {
      titleStr = 'abastecimentos_completo';
      rows.push(buildRow(['ID', 'Data', 'Horario', 'Placa', 'Combustivel', 'Litragem (L)', 'KM', 'Motorista', 'Responsavel', 'Hora Inicio', 'Hora Fim', 'Duracao', 'Duracao (min)']));
      dataSet.forEach((r) => {
        rows.push(buildRow([
          r.id, r.data, r.horario, r.placa, r.combustivel, r.litragem, r.km, r.motorista, r.responsavel,
          r.horaInicio, r.horaFim, r.duracao, r.duracaoMin
        ]));
      });
    } else if (tipo === 'resumo') {
      titleStr = 'consumo_consolidado_veiculo';
      const map: { [placa: string]: { placa: string; total: number; count: number; totalMin: number; maxSingle: number } } = {};
      dataSet.forEach((r) => {
        if (!map[r.placa]) {
          map[r.placa] = { placa: r.placa, total: 0, count: 0, totalMin: 0, maxSingle: 0 };
        }
        map[r.placa].total += r.litragem;
        map[r.placa].count++;
        map[r.placa].totalMin += r.duracaoMin || 0;
        if (r.litragem > map[r.placa].maxSingle) {
          map[r.placa].maxSingle = r.litragem;
        }
      });

      rows.push(buildRow(['Placa', 'Volume Total (L)', 'Qtd Abastecimentos', 'Media por Operacao (L)', 'Maior Abastecimento (L)', 'Tempo Medio Operacao (min)']));
      Object.values(map)
        .sort((a, b) => b.total - a.total)
        .forEach((v) => {
          rows.push(buildRow([
            v.placa,
            v.total.toFixed(1),
            v.count,
            (v.total / v.count).toFixed(1),
            v.maxSingle.toFixed(1),
            (v.totalMin / v.count).toFixed(1)
          ]));
        });
    } else if (tipo === 'diario') {
      titleStr = 'consumo_diario';
      const map: { [date: string]: { date: string; total: number; count: number; setVeiculos: Set<string>; ts: number } } = {};
      dataSet.forEach((r) => {
        const d = r.data;
        if (!map[d]) {
          map[d] = { date: d, total: 0, count: 0, setVeiculos: new Set(), ts: r.timestamp };
        }
        map[d].total += r.litragem;
        map[d].count++;
        map[d].setVeiculos.add(r.placa);
      });

      rows.push(buildRow(['Data', 'Combustivel Total (L)', 'Qtd Abastecimentos', 'Veiculos Atendidos']));
      Object.values(map)
        .sort((a, b) => a.ts - b.ts)
        .forEach((v) => {
          rows.push(buildRow([
            v.date,
            v.total.toFixed(1),
            v.count,
            Array.from(v.setVeiculos).join(' | ')
          ]));
        });
    } else if (tipo === 'motoristas') {
      titleStr = 'consumo_por_motorista';
      const map: { [motorista: string]: { motorista: string; total: number; count: number; totalMin: number; setVeiculos: Set<string> } } = {};
      dataSet.forEach((r) => {
        const m = r.motorista || 'Sem Identificacao';
        if (!map[m]) {
          map[m] = { motorista: m, total: 0, count: 0, totalMin: 0, setVeiculos: new Set() };
        }
        map[m].total += r.litragem;
        map[m].count++;
        map[m].totalMin += r.duracaoMin || 0;
        map[m].setVeiculos.add(r.placa);
      });

      rows.push(buildRow(['Motorista', 'Volume Total Abastecido (L)', 'Visitas/Registros', 'Tempo Medio Ocupado (min)', 'Veiculos Dirigidos']));
      Object.values(map)
        .sort((a, b) => b.total - a.total)
        .forEach((v) => {
          rows.push(buildRow([
            v.motorista,
            v.total.toFixed(1),
            v.count,
            (v.totalMin / v.count).toFixed(1),
            Array.from(v.setVeiculos).join(' | ')
          ]));
        });
    } else if (tipo === 'tempos') {
      titleStr = 'auditoria_tempo_operacao';
      rows.push(buildRow(['Placa', 'Data', 'Hora Inicio', 'Hora Fim', 'Duração (min)', 'Combustível', 'Refil (L)', 'Responsavel']));
      dataSet
        .filter((r) => r.horaInicio)
        .forEach((r) => {
          rows.push(buildRow([
            r.placa, r.data, r.horaInicio, r.horaFim, r.duracaoMin, r.combustivel, r.litragem, r.responsavel
          ]));
        });
    }

    // Add Unicode BOM for perfect Excel CSV opening (resolvves Pt-BR special characters encoding error)
    const csvWithBom = '\uFEFF' + rows.join('\r\n');
    setCsvContent(csvWithBom);
    setCsvFileName(`${titleStr}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);

    // Preview coordinates list
    setCsvPreview(rows.slice(0, 6)); // header + 5 lines preview
    showToast('👁️ Pré-visualização do CSV carregada abaixo.');
  };

  const triggerDownload = () => {
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = csvFileName;
    a.click();
    showToast('📥 Download do relatório CSV iniciado!');
  };

  return (
    <div className="w-full font-sans" id="exportar-csv-view">
      <div className="flex items-center gap-3 pb-3 mb-6 border-b border-gray-700/60">
        <FileDown className="w-6 h-6 text-amber-500" />
        <h2 className="font-sans font-bold text-lg tracking-tight uppercase text-gray-100">
          Exportar Relatórios CSV
        </h2>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800/80 mb-6 flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-800 pb-2">
          <Calendar className="w-4 h-4 text-amber-500" /> Filtros de Período e Parâmetros
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data de Início</label>
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={dataInicio}
              onChange={(e) => handleDateMask(e, setDataInicio)}
              maxLength={10}
              className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 rounded-xl py-2 px-3 outline-none text-xs transition-all font-mono"
              id="input-export-data-inicio"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data de Término</label>
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={dataFim}
              onChange={(e) => handleDateMask(e, setDataFim)}
              maxLength={10}
              className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 rounded-xl py-2 px-3 outline-none text-xs transition-all font-mono"
              id="input-export-data-fim"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filtrar por Placa</label>
            <select
              value={filtroPlaca}
              onChange={(e) => setFiltroPlaca(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-xl py-2.5 px-3 outline-none focus:border-amber-500 text-xs cursor-pointer"
              id="select-export-filtro-placa"
            >
              <option value="">Todas as Placas</option>
              {uniquePlacas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Combustível</label>
            <select
              value={filtroCombustivel}
              onChange={(e) => setFiltroCombustivel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-xl py-2.5 px-3 outline-none focus:border-amber-500 text-xs cursor-pointer"
              id="select-export-filtro-combustivel"
            >
              <option value="">Todos</option>
              <option value="DIESEL">🟡 Diesel</option>
              <option value="ARLA">🔵 Arla 32</option>
            </select>
          </div>
        </div>
      </div>

      {/* CSV GENERATION BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="csv-export-actions-grid">
        <button
          onClick={() => compileCSV('completo')}
          className="bg-gray-905 border border-gray-800/80 p-4 rounded-xl flex flex-col items-start gap-1 text-left hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-gray-200 cursor-pointer"
          id="btn-export-completo"
        >
          <span className="text-xl">📋</span>
          <h4 className="text-sm font-extrabold uppercase mt-1">Relatório Geral</h4>
          <p className="text-[10px] text-gray-500 leading-normal">Planilha completa: placa, Km, litros, frentista, timestamp, horários e fotos da bomba.</p>
        </button>

        <button
          onClick={() => compileCSV('resumo')}
          className="bg-gray-905 border border-gray-800/80 p-4 rounded-xl flex flex-col items-start gap-1 text-left hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-gray-200 cursor-pointer"
          id="btn-export-por-veiculo"
        >
          <span className="text-xl">🚛</span>
          <h4 className="text-sm font-extrabold uppercase mt-1">Consumo por Veículo</h4>
          <p className="text-[10px] text-gray-500 leading-normal">Total refilled, times visited, mean Refueling fuel index, standard durations by plaque.</p>
        </button>

        <button
          onClick={() => compileCSV('diario')}
          className="bg-gray-905 border border-gray-800/80 p-4 rounded-xl flex flex-col items-start gap-1 text-left hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-gray-200 cursor-pointer"
          id="btn-export-diario"
        >
          <span className="text-xl">📅</span>
          <h4 className="text-sm font-extrabold uppercase mt-1">Consumo Diário</h4>
          <p className="text-[10px] text-gray-500 leading-normal">Diário: data agrupada, volume de combustível dispersado, quantidade de operações e visitadores.</p>
        </button>

        <button
          onClick={() => compileCSV('motoristas')}
          className="bg-gray-905 border border-gray-800/80 p-4 rounded-xl flex flex-col items-start gap-1 text-left hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-gray-200 cursor-pointer"
          id="btn-export-motoristas"
        >
          <span className="text-xl">👷</span>
          <h4 className="text-sm font-extrabold uppercase mt-1 font-sans">Estatísticas Motorista</h4>
          <p className="text-[10px] text-gray-500 leading-normal">Frotistas: total consumido individualmente, média de tempo por operação e placas associadas.</p>
        </button>

        <button
          onClick={() => compileCSV('tempos')}
          className="bg-gray-905 border border-gray-800/80 p-4 rounded-xl flex flex-col items-start gap-1 text-left hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-gray-200 cursor-pointer"
          id="btn-export-tempo"
        >
          <span className="text-xl">⏱</span>
          <h4 className="text-sm font-extrabold uppercase mt-1">Auditoria de Tempo</h4>
          <p className="text-[10px] text-gray-500 leading-normal">Estudo temporal de abastecimentos: frentista por hora início, hora término e duração líquida.</p>
        </button>
      </div>

      {/* CSV PREVIEW WINDOW */}
      {csvPreview.length > 0 && (
        <div className="mt-8 bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl flex flex-col gap-4" id="csv-preview-container">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Pré-visualização do Arquivo <span className="font-mono text-[10px] lowercase text-amber-500">[{csvFileName}]</span>
            </h4>
          </div>

          <div className="bg-black/40 border border-gray-800 rounded-xl p-3 overflow-x-auto">
            <pre className="font-mono text-[10px] text-gray-500 leading-normal whitespace-pre min-w-[500px]">
              {csvPreview.join('\n')}
              {'\n'}... (+ mais linhas de dados na versão baixada)
            </pre>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerDownload}
              className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 border border-amber-600 hover:border-amber-700 shadow-xl shadow-amber-505/1 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all cursor-pointer"
              id="btn-download-csv"
            >
              Baixar Relatório Completo.csv
            </button>
            <button
              onClick={() => {
                setCsvContent('');
                setCsvPreview([]);
              }}
              className="py-3.5 px-6 rounded-xl hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-200 text-xs font-bold uppercase transition-all cursor-pointer"
              id="btn-limpar-preview"
            >
              Ocultar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
