import React, { useEffect, useState, useRef } from 'react';
import { Menu, Bot, ChevronRight, ArrowLeft, Eye, EyeOff, Check, Coins, UserCircle2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Journal from './components/Journal';
import Login from './components/Login';
import { AppState, Asset, AssetType, Currency, LLMConfig, Liability, JournalEntry, BrokerageAccount, Market, ClearedAsset } from './types';
import { LLM_PROVIDERS } from './constants';
import { loadRemoteState, saveRemoteState, INITIAL_STATE } from './services/storageService';
import { fetchCryptoPrices, fetchExchangeRates, fetchStockPrices } from './services/apiService';
import { DEFAULT_HKD_CNY_RATE } from './constants';

// Firebase imports
import { auth, googleProvider } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activePortfolioTab, setActivePortfolioTab] = useState<'stocks' | 'crypto' | 'manual' | 'lent' | 'liabilities'>('stocks');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [exchangeRates, setExchangeRates] = useState({ USD: 7.2, HKD: DEFAULT_HKD_CNY_RATE, CNY: 1 });
  const [priceLoading, setPriceLoading] = useState(false);

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Guard: only allow auto-save AFTER the initial Firebase data has been loaded.
  // Without this, the auto-save effect can fire with empty INITIAL_STATE the moment
  // the user object is set (before loadRemoteState completes), wiping Firebase data.
  const [saveEnabled, setSaveEnabled] = useState(false);

  // Use refs to track state for closures
  const stateRef = useRef(state);
  const userRef = useRef<User | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { userRef.current = user; }, [user]);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Firebase fires onAuthStateChanged multiple times (token refresh, reconnect, etc.).
        // If the same user is already loaded, skip re-loading to prevent overwriting
        // in-memory state (and subsequently writing stale data back to Firebase).
        if (userRef.current?.uid === currentUser.uid && saveEnabled) {
          setAuthLoading(false);
          return;
        }
        setUser(currentUser);
        // Load data from Firebase
        setDataLoading(true);
        const remoteData = await loadRemoteState(currentUser.uid);
        setState(remoteData);
        setDataLoading(false);
        setSaveEnabled(true);   // safe to auto-save from now on
        // Trigger price refresh after data load
        refreshData(remoteData.assets, remoteData);
      } else {
        // Only clear state if we are NOT in guest mode
        // If userRef.current is 'guest', we ignore the firebase 'null' event
        if (userRef.current?.uid !== 'guest') {
            setUser(null);
            setState(INITIAL_STATE);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Auto-Save to Firebase — only runs after initial load completes (saveEnabled guard)
  useEffect(() => {
    if (user && saveEnabled) {
      saveRemoteState(user.uid, state);
    }
  }, [state, user, saveEnabled]);

  // 3. Price Refresh Interval
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshData(stateRef.current.assets, stateRef.current);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Auth Handlers
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Please check your domain configuration in Firebase Console. You can use Guest Mode to test.");
    }
  };

  const handleGuestLogin = async () => {
      const guestUser = {
          uid: 'guest',
          email: 'guest@demo.com',
          displayName: 'Guest User',
          photoURL: null,
          emailVerified: true,
          isAnonymous: true,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => '',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
          phoneNumber: null,
          providerId: 'guest'
      } as unknown as User;

      setUser(guestUser);
      setAuthLoading(false);

      setDataLoading(true);
      const guestData = await loadRemoteState('guest');
      setState(guestData);
      setDataLoading(false);
      setSaveEnabled(true);
      refreshData(guestData.assets, guestData);
  };

  const handleLogout = async () => {
    if (user?.uid === 'guest') {
        setUser(null);
        setState(INITIAL_STATE);
        return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const refreshData = async (assetsToUpdate: Asset[], currentState: AppState) => {
    const targetAssets = assetsToUpdate;
    if (targetAssets.length === 0 && currentState.assets.length === 0) return;

    setPriceLoading(true);

    // 1. Get Exchange Rate
    const ratesData = await fetchExchangeRates();
    const usdToCny = ratesData.USD;
    const hkdToCny = DEFAULT_HKD_CNY_RATE;

    const newRates = { USD: usdToCny, HKD: hkdToCny, CNY: 1 };
    setExchangeRates(newRates);

    // 2. Fetch Prices
    const stockPrices = await fetchStockPrices(targetAssets);
    const cryptoPrices = await fetchCryptoPrices(targetAssets);

    // 3. Update Assets
    const updatedAssets = targetAssets.map(asset => {
      let price = asset.currentPrice;
      let dailyChangePct = asset.dailyChangePct;
      let name = asset.name;

      if (asset.type === AssetType.STOCK && stockPrices[asset.id]) {
        price = stockPrices[asset.id].price;
        dailyChangePct = stockPrices[asset.id].changePct;
        if (stockPrices[asset.id].name) {
            name = stockPrices[asset.id].name;
        }
      } else if (asset.type === AssetType.CRYPTO && cryptoPrices[asset.id]) {
        price = cryptoPrices[asset.id].price;
        dailyChangePct = cryptoPrices[asset.id].changePct;
      }

      let currentValue = 0; // Value in CNY
      let dailyChangeVal = 0;
      let totalReturnPct = 0;

      if (asset.type === AssetType.STOCK || asset.type === AssetType.CRYPTO) {
         if (price && asset.quantity) {
            let exchangeMult = 1;

            if (currentState.baseCurrency === Currency.CNY) {
               if (asset.type === AssetType.CRYPTO) {
                 exchangeMult = usdToCny;
               } else if (asset.market === Market.US) {
                 exchangeMult = usdToCny;
               } else if (asset.market === Market.HK) {
                 exchangeMult = hkdToCny;
               } else if (asset.market === Market.CN) {
                 exchangeMult = 1;
               }
            } else {
               if (asset.market === Market.CN) exchangeMult = 1/usdToCny;
               else if (asset.market === Market.HK) exchangeMult = hkdToCny/usdToCny;
            }

            currentValue = price * asset.quantity * exchangeMult;

            if (dailyChangePct !== undefined) {
               const prevVal = currentValue / (1 + (dailyChangePct / 100));
               dailyChangeVal = currentValue - prevVal;
            }

            if (asset.costBasis && asset.costBasis > 0) {
               totalReturnPct = ((price - asset.costBasis) / asset.costBasis) * 100;
            }
         }
      } else {
         // Manual Assets & Lent Money
         currentValue = asset.manualValue || 0;
         if (asset.currency !== currentState.baseCurrency) {
             if (currentState.baseCurrency === Currency.CNY && asset.currency === Currency.USD) currentValue = currentValue * usdToCny;
             if (currentState.baseCurrency === Currency.CNY && asset.currency === Currency.HKD) currentValue = currentValue * hkdToCny;
             if (currentState.baseCurrency === Currency.USD && asset.currency === Currency.CNY) currentValue = currentValue / usdToCny;
         }
      }

      return {
        ...asset,
        name,
        currentPrice: price,
        currentValue,
        dailyChangePct,
        dailyChangeVal,
        totalReturnPct
      };
    });

    // 4. Update Brokerage Account Totals
    const updatedBrokerages = currentState.brokerageAccounts.map(account => {
        const accountAssets = updatedAssets.filter(a => a.brokerageAccountId === account.id);

        let stocksValueNative = 0;

        accountAssets.forEach(asset => {
           if (asset.currentPrice && asset.quantity) {
              stocksValueNative += asset.currentPrice * asset.quantity;
           }
        });

        const totalValue = (account.availableCash || 0) + stocksValueNative;

        return {
           ...account,
           totalValue
        };
    });

    // 5. Calculate Total Net Worth for History
    const totalAssetsVal = updatedAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);

    let totalBrokerageCashBase = 0;
    updatedBrokerages.forEach(b => {
        let cashVal = 0;
        if (currentState.baseCurrency === Currency.CNY) {
             if (b.currency === Currency.CNY) cashVal = b.availableCash;
             else if (b.currency === Currency.USD) cashVal = b.availableCash * newRates.USD;
             else if (b.currency === Currency.HKD) cashVal = b.availableCash * newRates.HKD;
        } else {
             if (b.currency === Currency.USD) cashVal = b.availableCash;
             else if (b.currency === Currency.CNY) cashVal = b.availableCash / newRates.USD;
             else if (b.currency === Currency.HKD) cashVal = b.availableCash / 7.8;
        }
        totalBrokerageCashBase += cashVal;
    });

    const totalLiabilitiesVal = currentState.liabilities.reduce((sum, l) => {
        let liabVal = l.totalAmount;
        if (currentState.baseCurrency === Currency.CNY && l.currency === Currency.USD) {
            liabVal = l.totalAmount * newRates.USD;
        }
        return sum + liabVal;
    }, 0);

    const currentNetWorth = totalAssetsVal + totalBrokerageCashBase - totalLiabilitiesVal;

    const todayStr = new Date().toISOString().split('T')[0];
    const history = [...(currentState.history || [])];
    const existingIndex = history.findIndex(h => h.date === todayStr);

    if (existingIndex >= 0) {
        history[existingIndex] = { date: todayStr, value: currentNetWorth };
    } else {
        history.push({ date: todayStr, value: currentNetWorth });
    }
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setState(prev => {
      // Merge into CURRENT state (prev), not the stale snapshot passed to refreshData.
      // This prevents any concurrent user edits from being overwritten.

      // assets: only update price fields
      const priceMap = new Map(updatedAssets.map(a => [a.id, a]));
      const mergedAssets = prev.assets.map(a => priceMap.get(a.id) ?? a);

      // brokerageAccounts: only update computed totalValue, keep user-edited fields
      const brokerageTotalMap = new Map(updatedBrokerages.map(b => [b.id, b.totalValue]));
      const mergedBrokerages = prev.brokerageAccounts.map(b => ({
        ...b,
        totalValue: brokerageTotalMap.get(b.id) ?? b.totalValue
      }));

      // history: upsert today's entry into prev.history
      const mergedHistory = [...(prev.history ?? [])];
      const idx = mergedHistory.findIndex(h => h.date === todayStr);
      if (idx >= 0) {
        mergedHistory[idx] = { date: todayStr, value: currentNetWorth };
      } else {
        mergedHistory.push({ date: todayStr, value: currentNetWorth });
      }
      mergedHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        ...prev,
        assets: mergedAssets,
        brokerageAccounts: mergedBrokerages,
        history: mergedHistory
      };
    });

    setPriceLoading(false);
  };

  // State Wrappers that trigger Refresh
  const addAsset = (asset: Asset) => {
    setState(prev => {
        const newState = { ...prev, assets: [...prev.assets, asset] };
        refreshData(newState.assets, newState);
        return newState;
    });
  };

  const updateAsset = (asset: Asset) => {
    setState(prev => {
        const newAssets = prev.assets.map(a => a.id === asset.id ? asset : a);
        const newState = { ...prev, assets: newAssets };
        refreshData(newAssets, newState);
        return newState;
    });
  };

  const removeAsset = (id: string) => {
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  };

  // Logic for Clearing/Liquidating a Stock
  const liquidateAsset = (id: string, exitPrice: number, exitDate: string, exitReason: string) => {
    setState(prev => {
       const asset = prev.assets.find(a => a.id === id);
       if (!asset) return prev;

       const quantity = asset.quantity || 0;
       const costBasis = asset.costBasis || 0;
       const realizedPnL = (exitPrice - costBasis) * quantity;
       const exitTotalValue = exitPrice * quantity;

       let exitTotalValueBase = exitTotalValue;
       if (asset.market === Market.US && prev.baseCurrency === Currency.CNY) exitTotalValueBase *= exchangeRates.USD;
       else if (asset.market === Market.HK && prev.baseCurrency === Currency.CNY) exitTotalValueBase *= exchangeRates.HKD;

       const clearedItem: ClearedAsset = {
          id: asset.id,
          symbol: asset.symbol || '',
          name: asset.name,
          quantity: quantity,
          market: asset.market || Market.US,
          currency: asset.currency,
          buyCostBasis: costBasis,
          exitPrice: exitPrice,
          exitDate: exitDate,
          exitReason: exitReason,
          exitTotalValue,
          exitTotalValueBase,
          realizedPnL,
          clearedAt: new Date().toISOString()
       };

       const newAssets = prev.assets.filter(a => a.id !== id);
       const newState = {
          ...prev,
          assets: newAssets,
          clearedAssets: [clearedItem, ...(prev.clearedAssets || [])]
       };

       if (asset.brokerageAccountId) {
           const brokerage = prev.brokerageAccounts.find(b => b.id === asset.brokerageAccountId);
           if (brokerage) {
               const updatedBrokerage = {
                   ...brokerage,
                   availableCash: (brokerage.availableCash || 0) + exitTotalValue
               };
               newState.brokerageAccounts = prev.brokerageAccounts.map(b => b.id === brokerage.id ? updatedBrokerage : b);
           }
       }

       setTimeout(() => refreshData(newAssets, newState), 0);
       return newState;
    });
  };

  const addLiability = (liab: Liability) => {
     setState(prev => ({ ...prev, liabilities: [...prev.liabilities, liab]}));
  };

  const updateLiability = (liab: Liability) => {
     setState(prev => ({ ...prev, liabilities: prev.liabilities.map(l => l.id === liab.id ? liab : l)}));
  };

  const removeLiability = (id: string) => {
     setState(prev => ({ ...prev, liabilities: prev.liabilities.filter(l => l.id !== id)}));
  };

  const addBrokerage = (account: BrokerageAccount) => {
    setState(prev => ({ ...prev, brokerageAccounts: [...prev.brokerageAccounts, account] }));
  };

  const updateBrokerage = (account: BrokerageAccount) => {
    setState(prev => {
        const updated = prev.brokerageAccounts.map(b => b.id === account.id ? account : b);
        const newState = { ...prev, brokerageAccounts: updated };
        setTimeout(() => refreshData(newState.assets, newState), 0);
        return newState;
    });
  };

  const removeBrokerage = (id: string) => {
    setState(prev => ({
      ...prev,
      brokerageAccounts: prev.brokerageAccounts.filter(b => b.id !== id),
      assets: prev.assets.filter(a => a.brokerageAccountId !== id)
    }));
  };

  const addJournalEntry = (entry: JournalEntry) => {
    setState(prev => ({ ...prev, journal: [entry, ...prev.journal] }));
  };

  const updateJournalEntry = (entry: JournalEntry) => {
    setState(prev => ({
      ...prev,
      journal: prev.journal.map(j => j.id === entry.id ? entry : j)
    }));
  };

  const handleNavigate = (tab: string, subTab?: 'stocks' | 'crypto' | 'manual' | 'lent' | 'liabilities') => {
    setActiveTab(tab);
    if (subTab) {
      setActivePortfolioTab(subTab);
    }
  };

  // --- RENDER ---

  if (authLoading) {
      return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-green">Loading app...</div>;
  }

  if (!user) {
      return <Login onLogin={handleLogin} onGuestLogin={handleGuestLogin} loading={authLoading} />;
  }

  return (
    <div className="flex min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-green selection:text-black">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={user.email}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="md:ml-64 flex-1 p-4 md:p-8 overflow-x-hidden pb-20 md:pb-8">
        <header className="flex justify-between items-center mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-brand-card border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold capitalize">{activeTab}</h2>
              <p className="text-brand-muted text-xs md:text-sm mt-0.5 hidden sm:block">
                 {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             {(priceLoading || dataLoading) && <span className="text-xs text-brand-green animate-pulse hidden sm:block">Syncing...</span>}
             <div className="flex items-center gap-1 md:gap-2 bg-brand-card px-2 md:px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs text-brand-muted hidden sm:block">USD/CNY</span>
                <span className="font-mono font-bold text-xs md:text-sm">{exchangeRates.USD.toFixed(2)}</span>
             </div>
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand-card border border-white/10 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <span className="font-bold text-brand-green text-sm">{user.email?.charAt(0).toUpperCase()}</span>
                )}
             </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard
            state={state}
            exchangeRate={exchangeRates.USD}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'portfolio' && (
          <Portfolio
            state={state}
            activeTab={activePortfolioTab}
            onTabChange={setActivePortfolioTab}
            onAddAsset={addAsset}
            onUpdateAsset={updateAsset}
            onRemoveAsset={removeAsset}
            onLiquidateAsset={liquidateAsset}
            onAddLiability={addLiability}
            onUpdateLiability={updateLiability}
            onRemoveLiability={removeLiability}
            onAddBrokerage={addBrokerage}
            onUpdateBrokerage={updateBrokerage}
            onRemoveBrokerage={removeBrokerage}
            refreshPrices={() => refreshData(state.assets, state)}
            exchangeRates={exchangeRates}
            llmConfig={state.llmConfig}
          />
        )}

        {activeTab === 'journal' && (
          <Journal
            entries={state.journal}
            assets={state.assets}
            onAddEntry={addJournalEntry}
            onUpdateEntry={updateJournalEntry}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            state={state}
            onUpdateLLMConfig={(cfg: LLMConfig) => setState(p => ({ ...p, llmConfig: cfg }))}
            onToggleCurrency={() => {
              const next = state.baseCurrency === Currency.CNY ? Currency.USD : Currency.CNY;
              setState(p => ({ ...p, baseCurrency: next }));
            }}
            userId={user.uid}
          />
        )}
      </main>

      {/* Bottom navigation - mobile only */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

// ---- Settings Panel ----

interface SettingsPanelProps {
  state: AppState;
  onUpdateLLMConfig: (cfg: LLMConfig) => void;
  onToggleCurrency: () => void;
  userId: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ state, onUpdateLLMConfig, onToggleCurrency, userId }) => {
  const [page, setPage] = useState<'main' | 'llm'>('main');
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');

  const currentCfg = state.llmConfig;
  const [provider, setProvider] = useState(currentCfg?.provider ?? '');
  const [model, setModel] = useState(currentCfg?.model ?? '');
  const [apiKey, setApiKey] = useState(currentCfg?.apiKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const providerDef = LLM_PROVIDERS.find(p => p.id === provider);

  const goTo = (dest: 'main' | 'llm') => {
    setSlideDir(dest === 'llm' ? 'right' : 'left');
    setPage(dest);
    setSaved(false);
  };

  const handleProviderChange = (val: string) => {
    setProvider(val);
    const def = LLM_PROVIDERS.find(p => p.id === val);
    setModel(def ? (def.visionModels[0] || def.textModels[0] || '') : '');
    setSaved(false);
  };

  const handleSave = () => {
    if (!provider || !model || !apiKey.trim()) return;
    onUpdateLLMConfig({ provider, model, apiKey: apiKey.trim() });
    setSaved(true);
    setTimeout(() => { setSaved(false); goTo('main'); }, 1200);
  };

  const llmLabel = currentCfg?.provider
    ? `${LLM_PROVIDERS.find(p => p.id === currentCfg.provider)?.name ?? currentCfg.provider} · ${currentCfg.model}`
    : '未配置';

  const isVisionModel = providerDef?.visionModels.includes(model);

  // Slide animation direction
  const slideClass = slideDir === 'right' ? 'settings-slide-right' : 'settings-slide-left';

  return (
    <div className="max-w-lg overflow-hidden">
      <style>{`
        @keyframes slideFromRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideFromLeft  { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
        .settings-slide-right { animation: slideFromRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94); }
        .settings-slide-left  { animation: slideFromLeft  0.22s cubic-bezier(0.25,0.46,0.45,0.94); }
      `}</style>

      {/* ── MAIN PAGE ── */}
      {page === 'main' && (
        <div key="main" className={slideClass}>
          {/* Page title */}
          <div className="mb-6">
            <p className="text-[11px] font-semibold tracking-[0.15em] text-white/20 uppercase mb-1">偏好设置</p>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
          </div>

          {/* Setting rows */}
          <div className="bg-brand-card rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.05]">

            {/* LLM row */}
            <button
              onClick={() => goTo('llm')}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center shrink-0 group-hover:bg-brand-green/15 transition-colors">
                <Bot className="w-4 h-4 text-brand-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">AI 模型</p>
                <p className={`text-xs mt-0.5 truncate ${currentCfg?.provider ? 'text-brand-green/70' : 'text-white/30'}`}>
                  {llmLabel}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
            </button>

            {/* Currency row */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4 text-white/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">基础货币</p>
                <p className="text-xs text-white/30 mt-0.5">资产折算与展示单位</p>
              </div>
              <button
                onClick={onToggleCurrency}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] transition-colors"
              >
                <span className="text-xs font-mono font-bold text-white">{state.baseCurrency}</span>
                <span className="text-[10px] text-white/30">切换</span>
              </button>
            </div>

          </div>

          {/* Account info */}
          <div className="mt-6 flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
              <UserCircle2 className="w-4 h-4 text-white/30" />
            </div>
            <div>
              <p className="text-xs text-white/30 font-mono">{userId}</p>
              {userId === 'guest' && <p className="text-[10px] text-brand-green/60 mt-0.5">Guest Mode · 数据仅保存在本地</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── LLM DETAIL PAGE ── */}
      {page === 'llm' && (
        <div key="llm" className={slideClass}>
          {/* Back nav */}
          <button
            onClick={() => goTo('main')}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-6 -ml-1 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            返回设置
          </button>

          {/* Section header */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-brand-green" />
              </div>
              <h3 className="text-lg font-bold text-white">AI 模型配置</h3>
            </div>
            <p className="text-xs text-white/30 ml-9.5">配置后可使用 AI 持仓分析和截图导入功能</p>
          </div>

          <div className="space-y-3">
            {/* Provider */}
            <div className="bg-brand-card rounded-xl border border-white/[0.06] p-4 space-y-1.5">
              <label className="block text-[11px] font-semibold tracking-wide text-white/30 uppercase">模型厂商</label>
              <select
                value={provider}
                onChange={e => handleProviderChange(e.target.value)}
                className="w-full bg-brand-dark border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-green/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="">选择厂商</option>
                {LLM_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            {provider && (
              <div className="bg-brand-card rounded-xl border border-white/[0.06] p-4 space-y-1.5">
                <label className="block text-[11px] font-semibold tracking-wide text-white/30 uppercase">模型</label>
                <select
                  value={model}
                  onChange={e => { setModel(e.target.value); setSaved(false); }}
                  className="w-full bg-brand-dark border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-green/50 transition-colors appearance-none cursor-pointer"
                >
                  {providerDef && providerDef.visionModels.length > 0 && (
                    <optgroup label="视觉模型 — 支持截图识别">
                      {providerDef.visionModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </optgroup>
                  )}
                  {providerDef && providerDef.textModels.length > 0 && (
                    <optgroup label="文本模型 — 仅支持持仓分析">
                      {providerDef.textModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </optgroup>
                  )}
                </select>
                {model && (
                  <p className={`text-[11px] mt-1 ${isVisionModel ? 'text-brand-green/70' : 'text-white/30'}`}>
                    {isVisionModel ? '✓ 支持截图识别 + AI 持仓分析' : '仅支持 AI 持仓分析，不支持截图识别'}
                  </p>
                )}
              </div>
            )}

            {/* API Key */}
            <div className="bg-brand-card rounded-xl border border-white/[0.06] p-4 space-y-1.5">
              <label className="block text-[11px] font-semibold tracking-wide text-white/30 uppercase">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setSaved(false); }}
                  placeholder="sk-..."
                  className="w-full bg-brand-dark border border-white/[0.08] rounded-lg pl-3 pr-10 py-2.5 text-sm text-white outline-none focus:border-brand-green/50 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-white/20">API Key 仅存储在您的账户数据中，不会上传至其他服务器</p>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!provider || !model || !apiKey.trim() || saved}
            className={`mt-5 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                : 'bg-brand-green hover:bg-[#00b004] disabled:opacity-30 disabled:cursor-not-allowed text-black'
            }`}
          >
            {saved ? (
              <><Check className="w-4 h-4" /> 已保存</>
            ) : '保存配置'}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
