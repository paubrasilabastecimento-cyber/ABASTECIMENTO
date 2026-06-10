import { useState, useEffect } from 'react';
import { Abastecimento, TanqueConfig, FirebaseConfig } from './types';
import { seedAbastecimentos } from './utils';
import { _regToFields } from './components/FirebaseSyncView';

// Subcomponents
import RegisterFuel from './components/RegisterFuel';
import HistoryList from './components/HistoryList';
import DashView from './components/DashView';
import TankView from './components/TankView';
import FirebaseSyncView from './components/FirebaseSyncView';
import ExportCSVView from './components/ExportCSVView';

// Icons
import { Menu, PlusCircle, History, TrendingUp, Cloud, Download, Fuel } from 'lucide-react';

export default function App() {
  const [tab, setTab] = useState<'form' | 'registros' | 'dashboard' | 'tanque' | 'firebase' | 'exportar'>('form');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core States
  const [registros, setRegistros] = useState<Abastecimento[]>([]);
  const [tanqueCfg, setTanqueCfg] = useState<TanqueConfig>({ capacidade: 15000, atual: 15000 });
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>({ apikey: '', projectid: '', collection: 'abastecimentos' });
  const [autoSync, setAutoSync] = useState(false);
  const [senhaDesbloqueada, setSenhaDesbloqueada] = useState(false);

  // Alert State
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);

  // Initial Load & Seeding
  useEffect(() => {
    // 1. Initial local fueling list
    const seeds = seedAbastecimentos();
    setRegistros(seeds);

    // 2. Initial fuel storage configuration
    const storedTank = localStorage.getItem('tanqueCfg');
    if (storedTank) {
      try {
        setTanqueCfg(JSON.parse(storedTank));
      } catch {
        // use default
      }
    }

    // 3. Firebase setups
    const storedFb = localStorage.getItem('fbConfig');
    if (storedFb) {
      try {
        setFbConfig(JSON.parse(storedFb));
      } catch {
        // use default
      }
    }

    // 4. Auto sync setups
    const storedSync = localStorage.getItem('fbAutoSync');
    if (storedSync) {
      try {
        setAutoSync(JSON.parse(storedSync));
      } catch {
        // use default
      }
    }
  }, []);

  // Display Toast helper
  const showToast = (msg: string, erro = false) => {
    setToastMessage(msg);
    setToastError(erro);
    const timeout = setTimeout(() => setToastMessage(''), 3200);
    return () => clearTimeout(timeout);
  };

  // Add individual fuel dispatch entry point
  const handleAddNewRegistro = async (novo: Abastecimento) => {
    const updated = [novo, ...registros];
    setRegistros(updated);
    localStorage.setItem('abastecimentos', JSON.stringify(updated));

    // Handle non-blocking background auto-sync to Firebase REST channel
    if (autoSync && fbConfig.apikey && fbConfig.projectid) {
      const docId = String(novo.id);
      const url = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectid.trim()}/databases/(default)/documents/${fbConfig.collection.trim() || 'abastecimentos'}/${docId}?key=${fbConfig.apikey.trim()}`;

      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(_regToFields(novo)),
        });
        if (res.ok) {
          console.log(`Cloud backup synced successfully for vehicle ${novo.placa}`);
        } else {
          console.warn(`Cloud backup failed with code ${res.status}`);
        }
      } catch (err) {
        console.error('Auto sync networking dispatch failed', err);
      }
    }
  };

  // Clean local fueling history list completely
  const handleLimparRegistros = () => {
    setRegistros([]);
    localStorage.setItem('abastecimentos', JSON.stringify([]));
  };

  // Replace history array (used in Firebase cloud import pulls)
  const handleImportRegistros = (dados: Abastecimento[]) => {
    setRegistros(dados);
    localStorage.setItem('abastecimentos', JSON.stringify(dados));
  };

  const menuItems = [
    { id: 'form', name: 'Registrar', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'registros', name: 'Histórico', icon: <History className="w-4 h-4" /> },
    { id: 'dashboard', name: 'Dashboard', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'tanque', name: 'Estoque Fixado', icon: <Fuel className="w-4 h-4" /> },
    { id: 'firebase', name: 'Firebase', icon: <Cloud className="w-4 h-4" /> },
    { id: 'exportar', name: 'Exportar CSV', icon: <Download className="w-4 h-4" /> },
  ] as const;

  const navigateTo = (tabName: typeof tab) => {
    setTab(tabName);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0c12] text-[#e8eaf0] font-sans selection:bg-amber-500 selection:text-black">
      {/* HEADER SECTION */}
      <header className="h-14 bg-[#11141e] border-b-2 border-amber-500 flex items-center justify-between px-4 sticky top-0 z-[100] shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-xl text-gray-300 hover:bg-gray-800 transition-all cursor-pointer block md:hidden"
            id="mobile-sidebar-toggle-btn"
          >
            <Menu className="w-5 h-5 text-gray-200" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xl">⛽</span>
            <span className="font-display font-black text-lg tracking-wider text-gray-100 uppercase">
              Controle de <span className="text-amber-500">Frota</span>
            </span>
          </div>
        </div>

        <div className="text-right flex items-center gap-2">
          {senhaDesbloqueada && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#10b981] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> Frentista Admin
            </span>
          )}
        </div>
      </header>

      {/* WORKSPACE COMBINATIONS */}
      <div className="flex relative">
        {/* SIDEBAR ON DESKTOP & MOBILE TRANSITION DRAWER */}
        <aside
          className={`fixed md:sticky top-14 left-0 h-[calc(100vh-56px)] bg-[#11141e] border-r border-gray-805/80 w-60 z-[90] transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-0 md:translate-x-0'} shrink-0`}
          id="workspace-sidebar"
        >
          <div className="flex flex-col h-full py-4 px-3 justify-between">
            <nav className="flex flex-col gap-1.5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`w-full font-display font-medium uppercase text-xs tracking-wider py-3 px-4 rounded-xl flex items-center gap-3.5 transition-all text-left cursor-pointer ${tab === item.id ? 'bg-amber-500/10 border border-amber-500/25 text-amber-500 font-black' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-850 border border-transparent'}`}
                  id={`nav-btn-${item.id}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.name}</span>
                  {item.id === 'registros' && registros.length > 0 && (
                    <span className="ml-auto bg-amber-500 text-black font-sans font-black text-[10px] min-w-5 h-5 flex items-center justify-center rounded-full px-1 py-0.5">
                      {registros.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="border-t border-gray-805/40 pt-4 px-2 text-[10px] text-gray-500 font-bold tracking-wider uppercase leading-relaxed font-sans">
              <span>v1.2 · Painel Operacional</span>
            </div>
          </div>
        </aside>

        {/* BACKDROP SCRIM DIAL FOR MOBILE DRAWER CLOSURE */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[80] block md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
            id="mobile-sidebar-backdrop-scrim"
          />
        )}

        {/* CENTRAL VIEW AREA */}
        <main className="flex-1 p-5 md:p-8 max-w-4xl mx-auto min-h-[calc(100vh-56px)] overflow-x-hidden">
          {tab === 'form' && (
            <RegisterFuel
              onAddRegistro={handleAddNewRegistro}
              tanqueCfg={tanqueCfg}
              setTanqueCfg={setTanqueCfg}
              showToast={showToast}
            />
          )}

          {tab === 'registros' && (
            <HistoryList
              registros={registros}
              onLimparRegistros={handleLimparRegistros}
              showToast={showToast}
              senhaDesbloqueada={senhaDesbloqueada}
              setSenhaDesbloqueada={setSenhaDesbloqueada}
            />
          )}

          {tab === 'dashboard' && (
            <DashView
              registros={registros}
              tanqueCfg={tanqueCfg}
            />
          )}

          {tab === 'tanque' && (
            <TankView
              registros={registros}
              tanqueCfg={tanqueCfg}
              setTanqueCfg={setTanqueCfg}
              showToast={showToast}
            />
          )}

          {tab === 'firebase' && (
            <FirebaseSyncView
              registros={registros}
              onImportRegistros={handleImportRegistros}
              fbConfig={fbConfig}
              setFbConfig={setFbConfig}
              autoSync={autoSync}
              setAutoSync={setAutoSync}
              showToast={showToast}
            />
          )}

          {tab === 'exportar' && (
            <ExportCSVView
              registros={registros}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* FLOATING ACTION TOAST NOTIFIER */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[300] py-4 px-6 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-semibold text-white border transition-all animate-bounce ${toastError ? 'bg-rose-950/90 border-rose-500/40 shadow-rose-900/10' : 'bg-amber-950/90 border-amber-500/40 shadow-amber-900/10'}`}
          id="floating-toast-alert"
        >
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
