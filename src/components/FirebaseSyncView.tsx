import React, { useState, useEffect } from 'react';
import { Abastecimento, FirebaseConfig } from '../types';
import { Cloud, Wifi, WifiOff, FileCode, CheckCircle2, AlertCircle, RefreshCw, Send, Download } from 'lucide-react';

interface FirebaseSyncViewProps {
  registros: Abastecimento[];
  onImportRegistros: (dados: Abastecimento[]) => void;
  fbConfig: FirebaseConfig;
  setFbConfig: React.Dispatch<React.SetStateAction<FirebaseConfig>>;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  showToast: (msg: string, erro?: boolean) => void;
}

interface LogLine {
  id: string;
  time: string;
  txt: string;
  tipo: 'ok' | 'err' | 'info';
}

function _regToFields(r: any) {
  const fields: any = {};
  Object.keys(r).forEach((k) => {
    if (typeof r[k] === 'number') {
      fields[k] = { doubleValue: r[k] };
    } else if (typeof r[k] === 'string') {
      fields[k] = { stringValue: r[k] };
    } else if (typeof r[k] === 'boolean') {
      fields[k] = { booleanValue: r[k] };
    }
  });
  return { fields };
}

function _fieldsToReg(fields: any): any {
  if (!fields) return {};
  const obj: any = {};
  Object.keys(fields).forEach((k) => {
    const val = fields[k];
    if (val.doubleValue !== undefined) {
      obj[k] = parseFloat(val.doubleValue);
    } else if (val.integerValue !== undefined) {
      obj[k] = parseInt(val.integerValue, 10);
    } else if (val.stringValue !== undefined) {
      obj[k] = val.stringValue;
    } else if (val.booleanValue !== undefined) {
      obj[k] = !!val.booleanValue;
    }
  });
  return obj;
}

export default function FirebaseSyncView({
  registros,
  onImportRegistros,
  fbConfig,
  setFbConfig,
  autoSync,
  setAutoSync,
  showToast,
}: FirebaseSyncViewProps) {
  const [apiKey, setApiKey] = useState(fbConfig.apikey || '');
  const [projectId, setProjectId] = useState(fbConfig.projectid || '');
  const [collection, setCollection] = useState(fbConfig.collection || 'abastecimentos');

  const [status, setStatus] = useState<'offline' | 'online' | 'loading' | 'error'>('offline');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progressPct, setProgressPct] = useState<number | null>(null);

  const addLog = (txt: string, tipo: 'ok' | 'err' | 'info' = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, time, txt, tipo },
      ...prev.slice(0, 49),
    ]);
  };

  useEffect(() => {
    if (fbConfig.apikey && fbConfig.projectid) {
      setStatus('online');
    }
  }, [fbConfig]);

  const handleSalvarConfig = () => {
    const cfg: FirebaseConfig = {
      apikey: apiKey.trim(),
      projectid: projectId.trim(),
      collection: collection.trim() || 'abastecimentos',
    };
    setFbConfig(cfg);
    localStorage.setItem('fbConfig', JSON.stringify(cfg));
    addLog('💾 Configurações de conexão gravadas regionalmente.', 'ok');
    showToast('💾 Configurações salvas!');
  };

  const handleTestarConexao = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      addLog('⚠️ API Key e Project ID são requeridos para testar conexão.', 'err');
      setStatus('error');
      return;
    }
    setStatus('loading');
    addLog('🔌 Tentando comunicação com as APIsREST do Google Firestore...', 'info');

    try {
      const col = collection.trim() || 'abastecimentos';
      const url = `https://firestore.googleapis.com/v1/projects/${projectId.trim()}/databases/(default)/documents/${col}?pageSize=1&key=${apiKey.trim()}`;
      const res = await fetch(url);
      if (res.ok) {
        addLog('✅ Conexão estabelecida com sucesso com o banco Firestore!', 'ok');
        setStatus('online');
        showToast('🔥 Conexão Firebase bem-sucedida!');
      } else {
        const errObj = await res.json().catch(() => ({}));
        const errMsg = errObj.error?.message || `Código de erro HTTP: ${res.status}`;
        addLog(`❌ Falha de Conexão: ${errMsg}`, 'err');
        setStatus('error');
      }
    } catch (err: any) {
      addLog(`❌ Erro físico de rede: ${err.message}`, 'err');
      setStatus('error');
    }
  };

  const handleExportBatch = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      addLog('⚠️ Configure as credenciais do Firebase antes de sincronizar.', 'err');
      return;
    }
    if (registros.length === 0) {
      addLog('📭 Nenhum log local presente no navegador para sincronização.', 'info');
      return;
    }

    addLog(`📤 Sincronizando lote completo de ${registros.length} registros...`, 'info');
    setProgressPct(0);

    let okCount = 0;
    let errCount = 0;

    for (let i = 0; i < registros.length; i++) {
      const r = registros[i];
      const docId = String(r.id);
      const url = `https://firestore.googleapis.com/v1/projects/${projectId.trim()}/databases/(default)/documents/${collection.trim()}/${docId}?key=${apiKey.trim()}`;

      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(_regToFields(r)),
        });

        if (res.ok) {
          okCount++;
        } else {
          errCount++;
        }
      } catch {
        errCount++;
      }

      setProgressPct(Math.round(((i + 1) / registros.length) * 100));
    }

    addLog(`🏁 Lote concluído! Sucessos: ${okCount} | Erros ocorridos: ${errCount}`, errCount === 0 ? 'ok' : 'err');
    setProgressPct(null);
    showToast(`📤 Backup finalizado: ${okCount} enviados!`);
  };

  const handleImportBatch = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      addLog('⚠️ Configure as credenciais do Firebase antes de sincronizar.', 'err');
      return;
    }

    addLog('📥 Buscando registros gravados na nuvem do Firestore...', 'info');
    try {
      const all: Abastecimento[] = [];
      let pageToken = '';

      do {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId.trim()}/databases/(default)/documents/${collection.trim()}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey.trim()}`;
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok) {
          if (data.documents) {
            data.documents.forEach((doc: any) => {
              const r = _fieldsToReg(doc.fields);
              if (r.id) {
                all.push(r as Abastecimento);
              }
            });
          }
          pageToken = data.nextPageToken || '';
        } else {
          const errMsg = data.error?.message || 'Erro deconhecido';
          addLog(`❌ Falha na importação: ${errMsg}`, 'err');
          return;
        }
      } while (pageToken);

      // Sort freshly fetched records
      all.sort((a, b) => b.timestamp - a.timestamp);
      onImportRegistros(all);

      addLog(`📥 Sincronização concluída: ${all.length} registros puxados para o navegador.`, 'ok');
      showToast(`📥 ${all.length} registros sincronizados!`);
    } catch (err: any) {
      addLog(`❌ Erro físico de rede: ${err.message}`, 'err');
    }
  };

  return (
    <div className="w-full" id="firebase-sync-view">
      <div className="flex items-center gap-3 pb-3 mb-6 border-b border-gray-700/60 font-sans">
        <Cloud className="w-6 h-6 text-amber-500" />
        <h2 className="font-bold text-lg tracking-tight uppercase text-gray-100">
          Firebase Firestore
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* PARAMS CARD */}
        <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800/80 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : status === 'loading' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                {status === 'online' ? 'Firebase conectado' : status === 'loading' ? 'Conectando...' : 'Desconectado'}
              </span>
            </div>

            {/* AUTO SYNC TOGGLE */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Auto Sync</span>
              <div className="relative" onClick={() => setAutoSync(!autoSync)}>
                <div className={`w-10 h-5 rounded-full transition-all duration-200 ${autoSync ? 'bg-emerald-500' : 'bg-gray-800 border border-gray-700'}`} />
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${autoSync ? 'left-5.5' : 'left-0.5'}`} />
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Web API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Ex: AIzaSyD8GjQ9-xZ..."
                className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 rounded-xl py-2 px-3 outline-none text-sm transition-all"
                id="input-fb-api-key"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project ID</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Ex: frota-abastecimento-123"
                className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 rounded-xl py-2 px-3 outline-none text-sm transition-all"
                id="input-fb-project-id"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Firestore Collection</label>
              <input
                type="text"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="Ex: abastecimentos"
                className="w-full bg-gray-800 border border-gray-700 focus:border-amber-500 text-gray-100 rounded-xl py-2 px-3 outline-none text-sm transition-all"
                id="input-fb-collection"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleTestarConexao}
              disabled={status === 'loading'}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              id="btn-testar-conexao"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin text-amber-500' : ''}`} />
              Testar Conexão
            </button>
            <button
              onClick={handleSalvarConfig}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              id="btn-salvar-config-fb"
            >
              Gravar Credenciais
            </button>
          </div>
        </div>

        {/* OPERATIONS AND SYNC BAR LIST */}
        <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800/80 flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800 pb-2">
            Comando Manual
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportBatch}
              className="py-3 bg-gray-850 hover:bg-gray-800 border border-gray-700/80 text-amber-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
              id="btn-enviar-firebase"
            >
              <Send className="w-5 h-5" /> Enviar Tudo
            </button>

            <button
              onClick={handleImportBatch}
              className="py-3 bg-gray-850 hover:bg-gray-800 border border-gray-700/80 text-blue-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
              id="btn-baixar-firebase"
            >
              <Download className="w-5 h-5" /> Importar Nuvem
            </button>
          </div>

          {progressPct !== null && (
            <div className="mt-1" id="export-progress-bar">
              <div className="flex justify-between items-center mb-1 text-[10px] uppercase font-bold tracking-widest text-amber-500 animate-pulse">
                <span>Backup em progresso...</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/40">
                <div className="h-full bg-amber-500 transition-all rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* VINTAGE TERMINAL EMULATOR */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Logs de Sincronia</span>
            <div className="bg-black/80 h-36 border border-gray-800 rounded-xl p-3 overflow-y-auto flex flex-col gap-1.5 font-mono text-[10px] leading-relaxed select-text" id="firebase-terminal-box">
              {logs.length === 0 ? (
                <span className="text-gray-600">Aguardando gatilhos de sincronização...</span>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="flex gap-2">
                    <span className="text-gray-500">[{l.time}]</span>
                    <span className={l.tipo === 'ok' ? 'text-emerald-500 font-semibold' : l.tipo === 'err' ? 'text-rose-500 font-semibold' : 'text-cyan-500'}>
                      {l.txt}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export { _regToFields };
export { _fieldsToReg };
